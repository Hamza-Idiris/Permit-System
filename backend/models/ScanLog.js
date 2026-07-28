const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  inspector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  permitId: {
    type: String,
    default: ''
  },
  applicationId: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    default: ''
  },
  result: {
    type: String,
    enum: ['success', 'failed'],
    required: true,
    index: true
  },
  reason: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'verify'],
    default: 'web'
  },
  applicantName: {
    type: String,
    default: ''
  },
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScanLog', scanLogSchema);
