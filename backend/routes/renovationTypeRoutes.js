const express = require('express');
const router = express.Router();
const {
    getRenovationTypes,
    createRenovationType,
    updateRenovationType,
    deleteRenovationType
} = require('../controllers/renovationTypeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// GET all renovation types (public so mobile/web can read them)
router.route('/').get(getRenovationTypes);

// Admin-only CRUD
router.route('/').post(protect, authorizeRoles('superadmin'), createRenovationType);
router.route('/:id')
    .put(protect, authorizeRoles('superadmin'), updateRenovationType)
    .delete(protect, authorizeRoles('superadmin'), deleteRenovationType);

module.exports = router;
