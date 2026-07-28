const express = require('express');
const { logScan, getScanStats, resetInspectorScans } = require('../controllers/scanController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('inspector', 'staff', 'superadmin'), logScan);
router.get('/stats', protect, authorizeRoles('inspector', 'staff', 'superadmin'), getScanStats);
router.delete('/inspector/:id', protect, authorizeRoles('superadmin'), resetInspectorScans);

module.exports = router;
