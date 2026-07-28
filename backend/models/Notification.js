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
    enum: ['Success', 'Alert', 'Info', 'Applied', 'Approved', 'Returned', 'Rejected', 'Broadcast'],
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

notificationSchema.post('save', function (doc) {
  try {
    const { sendToUser } = require('../services/websocketService');
    sendToUser(doc.user, {
      type: 'NOTIFICATION_CREATED',
      payload: doc
    });
  } catch (err) {
    console.error('WebSocket Notification Broadcast Error:', err);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
