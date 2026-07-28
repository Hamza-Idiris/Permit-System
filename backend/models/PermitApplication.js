const mongoose = require('mongoose');

const permitApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  applicationId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Review', 'Approved', 'Returned'],
    default: 'Pending'
  },
  staffRemarks: {
    type: String,
    default: ''
  },
  isResubmitted: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Free'],
    default: 'Paid'
  },
  district: {
    type: String,
    required: true
  },
  formData: {
    requestType: { type: String, enum: ['New Construction', 'Renovation', 'Renew'], default: 'New Construction' },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    plotId: { type: String, required: true },
    district: { type: String, required: true },
    buildingCategory: { type: String, required: true },
    floors: { type: Number, default: 1 },
    landArea: { type: Number, required: true },
    totalFee: { type: Number, required: true }
  },
  documents: {
    nationalId: { type: String, required: true },
    ownershipDocs: { type: String, required: true }
  },
  permitId: {
    type: String,
    unique: true,
    sparse: true
  },
  qrData: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  lastReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastApprovalDate: {
    type: Date
  },
  lastExpiryDate: {
    type: Date
  },
  lastPermitId: {
    type: String
  },
  lastQrData: {
    type: String
  },
  renewedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PermitApplication',
    default: null
  },
  type: String

}, {
  timestamps: true
});

permitApplicationSchema.post('save', function (doc) {
  try {
    const { sendToUser, broadcastToAll } = require('../services/websocketService');
    // Notify the specific applicant user
    sendToUser(doc.user, {
      type: 'PERMIT_APPLICATION_UPDATED',
      payload: doc
    });
    // Also broadcast to all (web/inspector/staff dashboards can refresh listing live)
    broadcastToAll({
      type: 'GLOBAL_PERMIT_APPLICATION_UPDATED',
      payload: doc
    });
  } catch (err) {
    console.error('WebSocket PermitApplication Broadcast Error:', err);
  }
});

module.exports = mongoose.model('PermitApplication', permitApplicationSchema);
