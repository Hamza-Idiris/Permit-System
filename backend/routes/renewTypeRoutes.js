const express = require('express');
const router = express.Router();
const {
  getRenewTypes, createRenewType, updateRenewType, deleteRenewType
} = require('../controllers/renewTypeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/').get(getRenewTypes);
router.route('/').post(protect, authorizeRoles('superadmin'), createRenewType);
router.route('/:id').put(protect, authorizeRoles('superadmin'), updateRenewType).delete(protect, authorizeRoles('superadmin'), deleteRenewType);

module.exports = router;
