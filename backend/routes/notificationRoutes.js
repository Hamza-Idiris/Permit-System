const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  archiveNotification,
  getUnreadNotificationsCount,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @access  Private
router.get('/', protect, getNotifications);

// @route   GET /api/notifications/unread
// @access  Private
router.get('/unread', protect, getUnreadNotificationsCount);

// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, markAsRead);

// @route   PUT /api/notifications/:id/archive
// @access  Private
router.put('/:id/archive', protect, archiveNotification);

// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, deleteNotification);

module.exports = router;
