const express = require('express');
const {
    getDistricts,
    createDistrict,
    updateDistrict,
    deleteDistrict
} = require('../controllers/districtController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getDistricts);

router.use(authorizeRoles('superadmin'));
router.post('/', createDistrict);
router.put('/:id', updateDistrict);
router.delete('/:id', deleteDistrict);

module.exports = router;
