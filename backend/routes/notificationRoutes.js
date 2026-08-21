const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  archiveNotification,
  unarchiveNotification,
  getUnreadNotificationsCount,
  deleteNotification,
  sendNotification
} = require('../controllers/notificationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.get('/unread', protect, getUnreadNotificationsCount);
router.post('/send', protect, authorizeRoles('superadmin', 'staff'), sendNotification);
router.put('/:id/read', protect, markAsRead);
router.put('/:id/archive', protect, archiveNotification);
router.put('/:id/unarchive', protect, unarchiveNotification);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
