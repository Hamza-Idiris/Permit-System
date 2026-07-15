const express = require('express');
const { registerUser, createUser, getUsers, updateUser, deleteUser, updateUserProfile, changePassword } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/register').post(registerUser);

// Profile route needs to be before /:id to prevent 'profile' being treated as an id
router.route('/profile')
  .put(protect, updateUserProfile);

router.route('/change-password')
  .put(protect, changePassword);



router.route('/')
  .post(protect, authorizeRoles('superadmin'), createUser)
  .get(protect, authorizeRoles('superadmin'), getUsers);

router.route('/:id')
  .put(protect, authorizeRoles('superadmin'), updateUser)
  .delete(protect, authorizeRoles('superadmin'), deleteUser);

module.exports = router;
