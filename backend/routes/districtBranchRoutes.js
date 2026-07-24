const express = require('express');
const {
    getBranches,
    createBranch,
    updateBranch,
    deleteBranch
} = require('../controllers/districtBranchController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getBranches);

router.use(authorizeRoles('superadmin'));
router.post('/', createBranch);
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

module.exports = router;
