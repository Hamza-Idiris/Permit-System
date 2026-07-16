const express = require('express');
const router = express.Router();
const { processWaafiPay } = require('../controllers/paymentController');

// @route   POST /api/payment/waafi
// @desc    Process payment via WaafiPay API
// @access  Public
router.post('/waafi', processWaafiPay);

module.exports = router;
