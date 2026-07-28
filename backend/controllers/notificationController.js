const Notification = require('../models/Notification');
const User = require('../models/User');

const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;
    const showArchived = req.query.archived === 'true';

    const filter = {
      user: req.user._id,
      isArchived: showArchived
    };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false, isArchived: false }),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      hasMore: skip + limit < total,
      data: notifications,
    });
  } catch (error) {
    console.error('Fetch Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching notifications.' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this notification.' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ success: false, message: 'Server Error marking notification as read.' });
  }
};

const archiveNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    notification.isArchived = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Archive Error:', error);
    res.status(500).json({ success: false, message: 'Server Error archiving.' });
  }
};

const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false, isArchived: false });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Fetch Unread Count Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching unread count.' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this notification.' });
    }

    await notification.deleteOne();

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server Error deleting notification.' });
  }
};

// Admin: all roles / staff / inspector / applicant / district applicants / specific userIds
// Staff: pick one admin OR applicants in a chosen district
const sendNotification = async (req, res) => {
  try {
    const { message, role, userIds, target, adminId, district } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let recipients = [];

    if (req.user.role === 'staff') {
      if (target === 'admin') {
        if (!adminId) {
          return res.status(400).json({ success: false, message: 'Please select an admin' });
        }
        const admin = await User.findOne({ _id: adminId, role: 'superadmin', isActive: { $ne: false } }).select('_id');
        if (!admin) {
          return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        recipients = [admin];
      } else {
        // applicants in selected district (or staff's own district)
        const targetDistrict = district || req.user.district;
        if (!targetDistrict) {
          return res.status(400).json({ success: false, message: 'Please select a district' });
        }
        recipients = await User.find({
          role: 'applicant',
          district: targetDistrict,
          isActive: { $ne: false }
        }).select('_id');
      }
    } else if (req.user.role === 'superadmin') {
      if (target === 'district' || (district && role === 'applicant')) {
        if (!district) {
          return res.status(400).json({ success: false, message: 'Please select a district' });
        }
        recipients = await User.find({
          role: 'applicant',
          district,
          isActive: { $ne: false }
        }).select('_id');
      } else if (Array.isArray(userIds) && userIds.length > 0) {
        recipients = await User.find({ _id: { $in: userIds }, isActive: { $ne: false } }).select('_id');
      } else if (role && role !== 'all') {
        if (!['staff', 'inspector', 'applicant', 'superadmin'].includes(role)) {
          return res.status(400).json({ success: false, message: 'Invalid target role' });
        }
        recipients = await User.find({ role, isActive: { $ne: false } }).select('_id');
      } else {
        recipients = await User.find({
          role: { $in: ['staff', 'inspector', 'applicant'] },
          isActive: { $ne: false }
        }).select('_id');
      }
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized to send notifications' });
    }

    if (recipients.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching recipients found' });
    }

    const docs = recipients.map(u => ({
      user: u._id,
      message: String(message).trim(),
      type: 'Broadcast'
    }));

    await Notification.insertMany(docs);

    try {
      const { sendToUser } = require('../services/websocketService');
      for (const u of recipients) {
        sendToUser(u._id, {
          type: 'NOTIFICATION_CREATED',
          payload: { message: String(message).trim(), type: 'Broadcast' }
        });
      }
    } catch (_) { /* ignore */ }

    res.status(201).json({
      success: true,
      message: `Notification sent to ${recipients.length} recipient(s)`,
      sent: recipients.length
    });
  } catch (error) {
    console.error('Send Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server Error sending notification' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  archiveNotification,
  getUnreadNotificationsCount,
  deleteNotification,
  sendNotification
};
