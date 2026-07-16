const express = require('express');
const router = express.Router();
const {
  getBuildingTypes,
  createBuildingType,
  updateBuildingType,
  deleteBuildingType
} = require('../controllers/buildingTypeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Get all building types (public or protected based on your needs, making it public/protected so users can see types)
// Usually GET is open for users to see types
router.route('/').get(getBuildingTypes);

// Admin only routes for CRUD
router.route('/').post(protect, authorizeRoles('superadmin'), createBuildingType);
router.route('/:id').put(protect, authorizeRoles('superadmin'), updateBuildingType).delete(protect, authorizeRoles('superadmin'), deleteBuildingType);

module.exports = router;
