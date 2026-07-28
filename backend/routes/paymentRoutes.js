const express = require('express');
const router = express.Router();
const { processWaafiPay } = require('../controllers/paymentController');
const {
  optionalProtect,
  processOfflinePayment,
  updateOfflinePaymentPin,
} = require('../controllers/offlinePaymentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route   POST /api/payment/waafi
// @desc    Process payment via WaafiPay API
// @access  Public
router.post('/waafi', processWaafiPay);

// @route   POST /api/payment/offline
// @desc    Process payment with admin offline PIN
// @access  Public (optional auth for lockout tracking)
router.post('/offline', optionalProtect, processOfflinePayment);

// @route   PUT /api/payment/offline-pin
// @desc    Update offline payment PIN (superadmin only)
// @access  Private/Superadmin
router.put('/offline-pin', protect, authorizeRoles('superadmin'), updateOfflinePaymentPin);

module.exports = router;
