const express = require('express');
const {
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
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/register').post(registerUser);

router.route('/profile')
  .put(protect, updateUserProfile);

router.route('/change-password')
  .put(protect, changePassword);

router.route('/applicants')
  .get(protect, authorizeRoles('staff', 'superadmin'), getApplicants);

router.route('/admins')
  .get(protect, authorizeRoles('staff', 'superadmin'), getAdmins);

router.route('/walk-in')
  .post(protect, authorizeRoles('staff', 'superadmin'), createWalkInApplicant);

router.route('/')
  .post(protect, authorizeRoles('superadmin'), createUser)
  .get(protect, authorizeRoles('superadmin'), getUsers);

router.route('/:id/status')
  .put(protect, authorizeRoles('superadmin'), toggleUserStatus);

router.route('/:id/reset-password')
  .put(protect, authorizeRoles('superadmin'), adminResetPassword);

router.route('/:id')
  .put(protect, authorizeRoles('superadmin'), updateUser)
  .delete(protect, authorizeRoles('superadmin'), deleteUser);

module.exports = router;
