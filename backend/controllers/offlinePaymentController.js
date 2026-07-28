const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const SystemSettings = require('../models/SystemSettings');
const Transaction = require('../models/Transaction');
const PermitApplication = require('../models/PermitApplication');
const Notification = require('../models/Notification');

const DEFAULT_OFFLINE_PIN = '1234';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const getClientKey = (req) => {
  if (req.user?._id) return `user:${req.user._id.toString()}`;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : null)
    || req.ip
    || req.socket?.remoteAddress
    || 'unknown';
  return `ip:${ip}`;
};

const getOrCreateSettings = async () => {
  let settings = await SystemSettings.findOne({ key: 'global' });
  if (!settings) {
    const pinHash = await bcrypt.hash(DEFAULT_OFFLINE_PIN, 10);
    settings = await SystemSettings.create({
      key: 'global',
      offlinePaymentPinHash: pinHash,
      lockouts: [],
    });
  }
  return settings;
};

const findLockout = (settings, clientKey) =>
  settings.lockouts.find((l) => l.clientKey === clientKey);

const ensureUnlocked = (lockout) => {
  if (!lockout?.lockedUntil) return { locked: false };
  const until = new Date(lockout.lockedUntil).getTime();
  if (Date.now() < until) {
    const minutesLeft = Math.ceil((until - Date.now()) / 60000);
    return {
      locked: true,
      message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
      lockedUntil: lockout.lockedUntil,
    };
  }
  return { locked: false, expired: true };
};

const syncApplicationPaid = async (applicationId, amount) => {
  if (!applicationId) return;
  const app = await PermitApplication.findById(applicationId);
  if (!app) return;

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
      message: `Qidmadaada codsiga waa la bixiyay.`,
      type: 'Success',
      relatedId: app._id,
    });
  }
};

// Optional auth: attach user if Bearer token present, otherwise continue
const optionalProtect = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) {
    // ignore invalid token for public payment flow
  }
  next();
};

const processOfflinePayment = async (req, res) => {
  try {
    const { pin, amount, phone, applicationId } = req.body;

    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ success: false, message: 'Enter a valid 4-digit PIN' });
    }
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const settings = await getOrCreateSettings();
    const clientKey = getClientKey(req);
    let lockout = findLockout(settings, clientKey);

    const lockState = ensureUnlocked(lockout);
    if (lockState.locked) {
      return res.status(429).json({
        success: false,
        message: lockState.message,
        lockedUntil: lockState.lockedUntil,
      });
    }

    if (lockState.expired && lockout) {
      lockout.attempts = 0;
      lockout.lockedUntil = null;
    }

    const pinOk = await bcrypt.compare(String(pin), settings.offlinePaymentPinHash);

    if (!pinOk) {
      if (!lockout) {
        settings.lockouts.push({ clientKey, attempts: 1, lockedUntil: null });
        lockout = findLockout(settings, clientKey);
      } else {
        lockout.attempts = (lockout.attempts || 0) + 1;
      }

      if (lockout.attempts >= MAX_ATTEMPTS) {
        lockout.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
        lockout.attempts = 0;
        await settings.save();
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Try again in 5 minutes.',
          lockedUntil: lockout.lockedUntil,
        });
      }

      await settings.save();
      const remaining = MAX_ATTEMPTS - lockout.attempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // Success: clear lockout
    if (lockout) {
      settings.lockouts = settings.lockouts.filter((l) => l.clientKey !== clientKey);
      await settings.save();
    }

    const payerPhone = (phone && String(phone).replace(/\D/g, ''))
      || (req.user?.phone ? String(req.user.phone).replace(/\D/g, '').replace(/^252/, '') : '')
      || '000000000';

    const isSandboxMode = process.env.PAYMENT_MODE === 'live'
      ? false
      : process.env.PAYMENT_MODE === 'sandbox' || process.env.NODE_ENV === 'development';

    const transactionId = `TXN_${Date.now()}`;
    const timestamp = new Date().toISOString();

    await Transaction.create({
      applicationRef: applicationId || null,
      transactionId,
      phone: payerPhone,
      amount: parseFloat(amount),
      status: 'Success',
      paymentMode: isSandboxMode ? 'Sandbox' : 'Live',
      auditLog: [{
        event: 'PAYMENT_SUCCESS',
        timestamp: new Date(),
        details: { referenceId: crypto.randomBytes(4).toString('hex') },
      }],
    });

    await syncApplicationPaid(applicationId, amount);

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully.',
      data: {
        status: 'SUCCESS',
        transactionId,
        amount: parseFloat(amount),
        timestamp,
        paymentMode: isSandboxMode ? 'sandbox' : 'live',
      },
    });
  } catch (error) {
    console.error('Offline payment error:', error);
    return res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

const updateOfflinePaymentPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    const settings = await getOrCreateSettings();
    settings.offlinePaymentPinHash = await bcrypt.hash(String(pin), 10);
    settings.lockouts = [];
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Offline payment PIN updated successfully',
    });
  } catch (error) {
    console.error('Update offline PIN error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update PIN' });
  }
};

module.exports = {
  optionalProtect,
  processOfflinePayment,
  updateOfflinePaymentPin,
  DEFAULT_OFFLINE_PIN,
};
