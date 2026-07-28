const express = require('express');
const { getDashboardStats, getReports } = require('../controllers/analyticsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, authorizeRoles('superadmin', 'staff'), getDashboardStats);
router.route('/reports').get(protect, authorizeRoles('superadmin', 'staff'), getReports);

module.exports = router;
