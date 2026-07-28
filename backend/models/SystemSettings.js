const mongoose = require('mongoose');

const lockoutSchema = new mongoose.Schema({
  clientKey: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
}, { _id: false });

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global',
  },
  offlinePaymentPinHash: {
    type: String,
    required: true,
  },
  lockouts: {
    type: [lockoutSchema],
    default: [],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
