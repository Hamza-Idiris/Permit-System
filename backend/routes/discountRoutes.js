const express = require('express');
const router = express.Router();
const {
  getDiscounts, createDiscount, updateDiscount, deleteDiscount
} = require('../controllers/discountController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', getDiscounts);
router.post('/', protect, authorizeRoles('superadmin'), createDiscount);
router.put('/:id', protect, authorizeRoles('superadmin'), updateDiscount);
router.delete('/:id', protect, authorizeRoles('superadmin'), deleteDiscount);

module.exports = router;
