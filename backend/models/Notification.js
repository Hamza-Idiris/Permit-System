const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Success', 'Alert', 'Info', 'Applied', 'Approved', 'Returned', 'Rejected'],
    default: 'Info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  relatedId: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
