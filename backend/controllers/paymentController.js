const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const PermitApplication = require('../models/PermitApplication');
const Notification = require('../models/Notification'); // Used for sending notifications if payment successful

const processWaafiPay = async (req, res) => {
  try {
    // Also extract applicationId and mockStatus if passed
    const { phone, amount, applicationId, mockStatus } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Phone and amount are required' });
    }

    const referenceId = crypto.randomBytes(4).toString('hex');
    const invoiceId = crypto.randomInt(1000000, 9999999).toString();
    const timestamp = new Date().toISOString();

    // PAYMENT_MODE takes strict priority:
    //   - 'live'    → always real gateway (even in development)
    //   - 'sandbox' → always mocked
    //   - (not set) → fallback to NODE_ENV check
    const isSandboxMode = process.env.PAYMENT_MODE === 'live'
      ? false
      : process.env.PAYMENT_MODE === 'sandbox' || process.env.NODE_ENV === 'development';

    console.log(`[PAYMENT] Mode: ${isSandboxMode ? 'SANDBOX' : 'LIVE'} (PAYMENT_MODE=${process.env.PAYMENT_MODE}, NODE_ENV=${process.env.NODE_ENV})`);

    if (isSandboxMode) {
      console.log(`[PAYMENT-SANDBOX] Initiating sandbox payment for phone: ${phone}, amount: ${amount}`);

      // Simulate API delay of 1.5 seconds
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Determine successful/failed response for sandbox
      // Success criteria: phone starts with '25261000' OR mockStatus is not 'FAILED'
      const isTestSuccess = (phone.startsWith('25261000') || mockStatus !== 'FAILED') && mockStatus !== 'FAILED';

      const transactionId = `MOCK_TXN_${Date.now()}`;

      // Create Database Audit Log / Transaction
      const transaction = await Transaction.create({
        applicationRef: applicationId || null,
        transactionId: transactionId,
        phone: phone,
        amount: amount,
        status: isTestSuccess ? 'Success' : 'Failed',
        paymentMode: 'Sandbox',
        auditLog: [{
          event: isTestSuccess ? 'SANDBOX_PAYMENT_SUCCESS' : 'SANDBOX_PAYMENT_FAILED',
          timestamp: new Date(),
          details: { mockStatus, referenceId, invoiceId }
        }]
      });

      if (isTestSuccess) {
        console.log(`[PAYMENT-SANDBOX] Payment SUCCESS for transaction ${transactionId}`);

        // Update application if ID provided
        if (applicationId) {
          const app = await PermitApplication.findById(applicationId);
          if (app) {
            app.paymentStatus = 'Paid';
            if (amount && !isNaN(parseFloat(amount))) {
              app.formData.totalFee = parseFloat(amount);
            }
            // Unlock application review gate or set pending if needed
            if (app.status === 'Pending') {
              app.status = 'In Review';
            }
            await app.save();
            console.log(`[PAYMENT-SANDBOX] Application ${applicationId} synced successfully with totalFee ${amount}.`);

            // Trigger automatic notification (optional)
            if (app.user) {
              await Notification.create({
                user: app.user,
                message: `Qidmadaada codsiga waa la bixiyay. (${transactionId})`,
                type: 'Success',
                relatedId: app._id
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
            paymentMode: 'sandbox'
          }
        });
      } else {
        console.log(`[PAYMENT-SANDBOX] Payment FAILED for transaction ${transactionId}`);
        return res.status(400).json({
          success: false,
          message: 'Sandbox payment failed due to mock configuration.',
          data: {
            status: 'FAILED',
            transactionId,
            amount,
            timestamp,
            paymentMode: 'sandbox'
          }
        });
      }
    }

    // LIVE MODE LOGIC
    console.log(`[PAYMENT-LIVE] Initiating live payment for phone: ${phone}, amount: ${amount}`);

    // Fallback to exactly what the older WaafiPay payload was
    const waafiPayload = {
      "schemaVersion": "1.0",
      "requestId": "10111331034",
      "timestamp": timestamp.replace('T', ' ').substring(0, 19),
      "channelName": "WEB",
      "serviceName": "API_PURCHASE",
      "serviceParams": {
        "merchantUid": "M0910291",
        "apiUserId": "1000416",
        "apiKey": process.env.LIVE_PAYMENT_API_KEY || "API-675418888AHX",
        "paymentMethod": "mwallet_account",
        "payerInfo": {
          "accountNo": `252${phone}`
        },
        "transactionInfo": {
          "referenceId": referenceId,
          "invoiceId": invoiceId,
          "amount": parseFloat(amount),
          "currency": "USD",
          "description": "Permit Application Fee"
        }
      }
    };

    console.log("Sending WaafiPay request:", JSON.stringify(waafiPayload));

    const waafiUrl = process.env.PAYMENT_URL || 'https://api.waafipay.net/asm';
    const response = await fetch(waafiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(waafiPayload)
    });

    const data = await response.json();
    console.log("WaafiPay Response:", data);

    // Initial Live Transaction tracking
    const liveTransactionId = data.transactionId || `LIVE_TXN_${Date.now()}`;
    const isLiveSuccess = data.responseCode === '2001' || data.responseMsg === 'RCS_SUCCESS' || data.errorCode === '0' || data.responseCode === '2000';

    await Transaction.create({
      applicationRef: applicationId || null,
      transactionId: liveTransactionId,
      phone: phone,
      amount: amount,
      status: isLiveSuccess ? 'Pending' : 'Failed', // "Pending" ussd push
      paymentMode: 'Live',
      auditLog: [{
        event: 'LIVE_PAYMENT_INITIATED',
        timestamp: new Date(),
        details: { responseCode: data.responseCode, responseMsg: data.responseMsg }
      }]
    });

    if (isLiveSuccess) {
      console.log(`[PAYMENT-LIVE] USSD push sent successfully. Transaction: ${liveTransactionId}`);

      // Match pre-sandbox behaviour: mark application as Paid after USSD push initiates.
      // (The real deduction happens after the user enters their PIN on device - WaafiPay handles that separately.)
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
          console.log(`[PAYMENT-LIVE] Application ${applicationId} marked as Paid & In Review with totalFee ${amount}.`);
        }
      }

      return res.status(200).json({ success: true, message: 'Payment initiated successfully, check your phone.', data });
    } else {
      return res.status(400).json({ success: false, message: data.responseMsg || 'Payment failed', data });
    }

  } catch (error) {
    console.error('WaafiPay error:', error);
    res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

module.exports = {
  processWaafiPay
};
