const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Generate JWT Token
const generateToken = (id, role, fullName, district) => {
  return jwt.sign({ id, role, fullName, district }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, gender } = req.body;

    // Security Fix: Prevent role injection from public registrations
    const role = 'applicant';
    const district = undefined;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({ fullName, email, phone, password, role, district, gender });

    res.status(201).json({
      success: true,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      district: user.district,
      gender: user.gender,
      token: generateToken(user._id, user.role, user.fullName, user.district),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Create a new user (admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, role, district, gender } = req.body;

    // Prevent creating superadmin users through this endpoint
    if (role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot create superadmin users' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = new User({ fullName, email, phone, password, role, district, gender });
    user._isTemporaryPassword = true; // Bypass strict rules for admin-created temporary passwords
    await user.save();

    // For staff and inspectors, send a password reset link automatically
    if (['staff', 'inspector'].includes(role)) {
      // Generate 6-digit numeric code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

      user.resetCode = resetCode;
      user.resetCodeExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours for initial setup
      await user.save({ validateBeforeSave: false });
      //Local host backend uu ka kacsan yahay
      const setupUrl = `http://localhost:5173/forgot-password?email=${user.email}&step=2`;

      try {
        await sendEmail({
          email: user.email,
          subject: 'Welcome to Sovereign Ledger - Create Your Password',
          message: `Welcome to the team, ${user.fullName}! An administrator has created your account. Please use the following link to set your permanent password: ${setupUrl}\n\nYour temporary verification code is: ${resetCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #001F3F;">Welcome to Sovereign Ledger</h2>
              <p>Hello <b>${user.fullName}</b>,</p>
              <p>Your official account has been created successfully as a <b>${role.toUpperCase()}</b>.</p>
              <p>To complete your setup, please set your permanent password by clicking the button below:</p>
              <div style="margin: 30px 0;">
                <a href="${setupUrl}" style="background-color: #001F3F; color: white; padding: 15px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">Create My Password</a>
              </div>
              <p>Alternatively, you can go to the login page and use this verification code: <b style="font-size: 18px; color: #001F3F;">${resetCode}</b></p>
              <p>This link will remain active for 24 hours.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">Mogadishu Urban Permit Authority - Digital Sovereignty Engine</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Welcome email failed to send:', emailErr);
        // We don't return error here because user is already created
      }
    }

    res.status(201).json({
      success: true,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      district: user.district,
      gender: user.gender,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Create User Error:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    // Exclude superadmin users from the list
    const users = await User.find({ role: { $ne: 'superadmin' } });
    res.json({ success: true, result: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    List superadmins (for staff compose → send to admin)
// @route   GET /api/users/admins
// @access  Private/Staff|Admin
const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'superadmin', isActive: { $ne: false } })
      .select('fullName email')
      .sort({ fullName: 1 });
    res.json({ success: true, result: admins.length, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Search applicants (for staff walk-in applications)
// @route   GET /api/users/applicants
// @access  Private/Staff|Admin
const getApplicants = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const filter = { role: 'applicant' };

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    const users = await User.find(filter)
      .select('fullName email phone gender district createdAt')
      .sort({ fullName: 1 })
      .limit(50);

    res.json({ success: true, result: users.length, data: users });
  } catch (error) {
    console.error('Get Applicants Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create or find walk-in applicant for staff counter service
// @route   POST /api/users/walk-in
// @access  Private/Staff|Admin
const createWalkInApplicant = async (req, res) => {
  try {
    const { fullName, email, phone, gender } = req.body;

    if (!fullName || !email || !phone || !gender) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email, phone, and gender are required'
      });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existing) {
      if (existing.role !== 'applicant') {
        return res.status(400).json({
          success: false,
          message: 'A non-applicant account already uses this email or phone'
        });
      }
      return res.status(200).json({
        success: true,
        created: false,
        data: {
          _id: existing._id,
          fullName: existing.fullName,
          email: existing.email,
          phone: existing.phone,
          gender: existing.gender,
          district: existing.district
        }
      });
    }

    const tempPassword = `WalkIn@${Math.floor(100000 + Math.random() * 900000)}`;
    const user = new User({
      fullName,
      email: email.toLowerCase(),
      phone,
      password: tempPassword,
      role: 'applicant',
      gender,
      district: req.user.role === 'staff' ? (req.user.district || '') : ''
    });
    user._isTemporaryPassword = true;
    await user.save();

    res.status(201).json({
      success: true,
      created: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        district: user.district
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    console.error('Walk-in Applicant Error:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};


// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.role = req.body.role || user.role;
      user.district = req.body.district || user.district;
      user.gender = req.body.gender || user.gender;
      if (typeof req.body.isActive === 'boolean') {
        user.isActive = req.body.isActive;
      }
      // If password exists in request, update it (will trigger pre-save hook)
      if (req.body.password) {
        user.password = req.body.password;
        user._isTemporaryPassword = true; // Admin updating another user
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        district: updatedUser.district,
        gender: updatedUser.gender,
        isActive: updatedUser.isActive !== false,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (user) {
      res.json({ success: true, message: 'User removed' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Toggle user active/inactive
// @route   PUT /api/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate a superadmin' });
    }

    const next = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
    user.isActive = next;
    await user.save();

    res.json({
      success: true,
      message: `User ${next ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Admin reset user password (sets temp password + optional email)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
const adminResetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tempPassword = req.body.password || `Reset@${Math.floor(100000 + Math.random() * 900000)}`;
    user.password = tempPassword;
    user._isTemporaryPassword = true;
    user.passwordLastChanged = Date.now();

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset - Sovereign Ledger',
        message: `Hello ${user.fullName}, an administrator reset your password. Temporary password: ${tempPassword}. Verification code: ${resetCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #001F3F;">Password Reset</h2>
            <p>Hello <b>${user.fullName}</b>,</p>
            <p>An administrator has reset your account password.</p>
            <p><b>Temporary password:</b> ${tempPassword}</p>
            <p><b>Verification code:</b> ${resetCode}</p>
            <p>Please log in and change your password immediately.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Reset password email failed:', emailErr);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. Temporary password emailed if mail is configured.',
      temporaryPassword: tempPassword
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Verification is now mandatory for profile updates
      if (!req.body.currentPassword) {
        return res.status(400).json({ success: false, message: 'Please provide your current password to authorize changes' });
      }

      // We need to get the password field which is hidden by default
      const userWithPassword = await User.findById(req.user._id).select('+password');
      const isMatch = await userWithPassword.matchPassword(req.body.currentPassword);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid current password' });
      }

      user.fullName = req.body.fullName || user.fullName;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.gender = req.body.gender || user.gender;

      // Note: We no longer update the password here as per new requirements
      // Profiles are now updated using currentPassword as authorization only.

      const updatedUser = await user.save();

      res.json({
        success: true,
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        district: updatedUser.district,
        gender: updatedUser.gender,
        passwordLastChanged: updatedUser.passwordLastChanged,
        token: generateToken(updatedUser._id, updatedUser.role, updatedUser.fullName, updatedUser.district),
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both old and new passwords' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(oldPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid old password' });
    }

    user.password = newPassword;
    user.passwordLastChanged = Date.now();
    await user.save();

    res.json({ success: true, message: 'Password updated successfully', passwordLastChanged: user.passwordLastChanged });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  registerUser,
  createUser,
  getUsers,
  getAdmins,
  getApplicants,
  createWalkInApplicant,
  updateUser,
  deleteUser,
  toggleUserStatus,
  adminResetPassword,
  updateUserProfile,
  changePassword
};
