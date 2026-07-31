const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id, role, fullName, district) => {
  return jwt.sign({ id, role, fullName, district }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, gender } = req.body;
    const role = 'applicant'; // Auto-assignment

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role,
      gender,
    });

    if (user) {
      res.status(201).json({
        success: true,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        district: user.district,
        gender: user.gender,
        passwordLastChanged: user.passwordLastChanged,
        createdAt: user.createdAt,
        token: generateToken(user._id, user.role, user.fullName, user.district),
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    res.json({
      success: true,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      district: user.district,
      isActive: user.isActive !== false,
      passwordLastChanged: user.passwordLastChanged,
      createdAt: user.createdAt,
      token: generateToken(user._id, user.role, user.fullName, user.district),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Forgot Password - Send 6-digit code
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email, platform } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Platform-based restriction
    if (platform === 'app') {
      if (!['applicant', 'inspector'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'This account restricted to web access only. Please reset from the dashboard.'
        });
      }
    } else if (platform === 'web') {
      if (!['superadmin', 'staff'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Applicants and Inspectors must use the mobile app for password recovery.'
        });
      }
    } else {
      // Default behavior if platform not specified (optional, but good for security)
      return res.status(400).json({ success: false, message: 'Invalid platform specification' });
    }

    // Generate 6-digit numeric code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set resetCode and expiry (10 mins)
    user.resetCode = resetCode;
    user.resetCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send Email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Verification Code',
        message: `Your verification code is: ${resetCode}. It will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #001F3F;">Sovereign Ledger Password Recovery</h2>
            <p>Verification Code: <b style="font-size: 24px; color: #001F3F;">${resetCode}</b></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, message: 'Verification code sent to email' });
    } catch (err) {
      user.resetCode = undefined;
      user.resetCodeExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Email Error:', err);
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Reset Code
// @route   POST /api/auth/verify-code
// @access  Public
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({
      email,
      resetCode: code,
      resetCodeExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    res.status(200).json({ success: true, message: 'Code verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const user = await User.findOne({
      email,
      resetCode: code,
      resetCodeExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session' });
    }

    // Update password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    user.password = password;
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;

    // We use validateBeforeSave: false to avoid validation errors for fields 
    // we aren't changing (like 'phone' which might be missing in older accounts)
    await user.save({ validateBeforeSave: false });

    // Send Success Email Notification
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Changed Successfully',
        message: `Hello ${user.fullName}, your password for Sovereign Ledger has been successfully updated.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #001F3F;">Sovereign Ledger: Password Updated</h2>
            <p>Hello <b>${user.fullName}</b>,</p>
            <p>This is a confirmation that the password for your account has been successfully reset.</p>
            <p>If you did not make this change, please contact an administrator immediately to secure your account.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">Urban Permit Authority - Mogadishu Digital Sovereignty</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Success email notification error:', emailError);
      // We do not fail the request if just the notification fails, 
      // as the password has already been changed in the DB.
    }

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword
};
