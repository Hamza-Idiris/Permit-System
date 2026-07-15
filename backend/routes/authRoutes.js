const express = require('express');
const {
  register,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword
} = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Example of a protected route for testing
router.get('/me', protect, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

module.exports = router;
