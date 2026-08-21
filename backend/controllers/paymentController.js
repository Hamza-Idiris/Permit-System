const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const PermitApplication = require('../models/PermitApplication');
const Notification = require('../models/Notification');

const WAAFI_URL = process.env.PAYMENT_URL || 'https://api.waafipay.net/asm';
const WAAFI_TIMEOUT_MS = 90000;

const toWaafiAccountNo = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('252')) return digits;
  if (digits.startsWith('0')) return `252${digits.slice(1)}`;
  return `252${digits}`;
};

const formatWaafiTimestamp = () =>
  new Date().toISOString().replace('T', ' ').substring(0, 19);

const isWaafiSuccess = (data) => {
  if (!data || typeof data !== 'object') return false;
  const code = String(data.responseCode ?? data.errorCode ?? '');
  const msg = String(data.responseMsg ?? data.responseMessage ?? '').toUpperCase();
  return (
    code === '2001' ||
    code === '2000' ||
    code === '0' ||
    msg.includes('RCS_SUCCESS') ||
    msg === 'SUCCESS'
  );
};

const processWaafiPay = async (req, res) => {
  try {
    const { phone, amount, applicationId, mockStatus } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Phone and amount are required' });
    }

    const referenceId = crypto.randomBytes(4).toString('hex');
    const invoiceId = crypto.randomInt(1000000, 9999999).toString();
    const requestId = `${Date.now()}${crypto.randomInt(1000, 9999)}`;
    const timestamp = new Date().toISOString();
    const accountNo = toWaafiAccountNo(phone);

    if (accountNo.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid Hormuud / Waafi number, e.g. 61XXXXXXX',
      });
    }

    // Sandbox only when explicitly requested. Online payment is live by default.
    const isSandboxMode = process.env.PAYMENT_MODE === 'sandbox';

    console.log(`[PAYMENT] Mode: ${isSandboxMode ? 'SANDBOX' : 'LIVE'} (PAYMENT_MODE=${process.env.PAYMENT_MODE || 'unset'})`);

    if (isSandboxMode) {
      console.log(`[PAYMENT-SANDBOX] Initiating sandbox payment for phone: ${phone}, amount: ${amount}`);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const isTestSuccess = mockStatus !== 'FAILED';
      const transactionId = `MOCK_TXN_${Date.now()}`;

      await Transaction.create({
        applicationRef: applicationId || null,
        transactionId,
        phone,
        amount,
        status: isTestSuccess ? 'Success' : 'Failed',
        paymentMode: 'Sandbox',
        auditLog: [{
          event: isTestSuccess ? 'SANDBOX_PAYMENT_SUCCESS' : 'SANDBOX_PAYMENT_FAILED',
          timestamp: new Date(),
          details: { mockStatus, referenceId, invoiceId },
        }],
      });

      if (isTestSuccess) {
        if (applicationId) {
          const app = await PermitApplication.findById(applicationId);
          if (app) {
            app.paymentStatus = 'Paid';
            if (amount && !isNaN(parseFloat(amount))) {
              app.formData.totalFee = parseFloat(amount);
            }
            if (app.status === 'Pending') {
              app.status = 'In Review';
            }
            await app.save();

            if (app.user) {
              await Notification.create({
                user: app.user,
                message: `Your application fee has been paid. (${transactionId})`,
                type: 'Success',
                relatedId: app._id,
              });
            }
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Sandbox payment processed successfully.',
          data: {
            status: 'SUCCESS',
            transactionId,
            amount,
            timestamp,
            paymentMode: 'sandbox',
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Sandbox payment failed due to mock configuration.',
        data: {
          status: 'FAILED',
          transactionId,
          amount,
          timestamp,
          paymentMode: 'sandbox',
        },
      });
    }

    const parsedAmount = Number(parseFloat(amount).toFixed(2));
    console.log(`[PAYMENT-LIVE] Waafi purchase accountNo=${accountNo} amount=${parsedAmount}`);

    const waafiPayload = {
      schemaVersion: '1.0',
      requestId,
      timestamp: formatWaafiTimestamp(),
      channelName: 'WEB',
      serviceName: 'API_PURCHASE',
      serviceParams: {
        merchantUid: process.env.WAAFI_MERCHANT_UID || 'M0910291',
        apiUserId: process.env.WAAFI_API_USER_ID || '1000416',
        apiKey: process.env.LIVE_PAYMENT_API_KEY || 'API-675418888AHX',
        paymentMethod: 'mwallet_account',
        payerInfo: {
          accountNo,
        },
        transactionInfo: {
          referenceId,
          invoiceId,
          amount: parsedAmount,
          currency: 'USD',
          description: 'Permit Application Fee',
        },
      },
    };

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), WAAFI_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(WAAFI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waafiPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(abortTimer);
    }

    const rawBody = await response.text();
    let data = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      console.error('WaafiPay returned non-JSON:', rawBody.slice(0, 500));
      return res.status(502).json({
        success: false,
        message: 'WaafiPay returned an unexpected response. Try again.',
      });
    }

    console.log('WaafiPay Response:', {
      httpStatus: response.status,
      responseCode: data.responseCode,
      responseMsg: data.responseMsg || data.responseMessage,
      errorCode: data.errorCode,
      transactionId: data.transactionId,
    });

    const liveTransactionId = data.transactionId || `LIVE_TXN_${Date.now()}`;
    const liveSuccess = isWaafiSuccess(data);

    await Transaction.create({
      applicationRef: applicationId || null,
      transactionId: liveTransactionId,
      phone: accountNo,
      amount: parsedAmount,
      status: liveSuccess ? 'Success' : 'Failed',
      paymentMode: 'Live',
      auditLog: [{
        event: liveSuccess ? 'LIVE_PAYMENT_SUCCESS' : 'LIVE_PAYMENT_FAILED',
        timestamp: new Date(),
        details: {
          responseCode: data.responseCode,
          responseMsg: data.responseMsg || data.responseMessage,
          errorCode: data.errorCode,
        },
      }],
    });

    if (liveSuccess) {
      if (applicationId) {
        const app = await PermitApplication.findById(applicationId);
        if (app) {
          app.paymentStatus = 'Paid';
          app.formData.totalFee = parsedAmount;
          if (app.status === 'Pending') {
            app.status = 'In Review';
          }
          await app.save();

          if (app.user) {
            await Notification.create({
              user: app.user,
              message: `Your application fee has been paid. (${liveTransactionId})`,
              type: 'Success',
              relatedId: app._id,
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment successful. Check your Waafi / Hormuud phone for the PIN prompt if it appears.',
        data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.responseMsg || data.responseMessage || data.errorMsg || 'WaafiPay payment failed',
      data,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'WaafiPay took too long. Approve the PIN on your phone and try again.',
      });
    }
    console.error('WaafiPay error:', error);
    res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

module.exports = {
  processWaafiPay,
};
