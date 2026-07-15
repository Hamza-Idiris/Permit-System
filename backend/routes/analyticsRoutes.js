const express = require('express');
const { getDashboardStats } = require('../controllers/analyticsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, authorizeRoles('superadmin'), getDashboardStats);

module.exports = router;
