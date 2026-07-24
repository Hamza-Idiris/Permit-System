const DistrictBranch = require('../models/DistrictBranch');

// @desc   Get all branches (optionally filter by district)
// @route  GET /api/district-branches
// @access Protected
exports.getBranches = async (req, res) => {
    try {
        const filter = {};
        if (req.query.district) filter.district = req.query.district;

        const branches = await DistrictBranch.find(filter)
            .populate('district', 'name code')
            .populate('manager', 'fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: branches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Create a new branch
// @route  POST /api/district-branches
// @access Superadmin
exports.createBranch = async (req, res) => {
    try {
        const { district, name, code, address, phone, manager, notes } = req.body;
        const branch = await DistrictBranch.create({ district, name, code, address, phone, manager: manager || null, notes });
        const populated = await branch.populate([
            { path: 'district', select: 'name code' },
            { path: 'manager', select: 'fullName email' }
        ]);
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc   Update a branch
// @route  PUT /api/district-branches/:id
// @access Superadmin
exports.updateBranch = async (req, res) => {
    try {
        const { district, name, code, address, phone, manager, isActive, notes } = req.body;
        const branch = await DistrictBranch.findByIdAndUpdate(
            req.params.id,
            { district, name, code, address, phone, manager: manager || null, isActive, notes },
            { new: true, runValidators: true }
        )
            .populate('district', 'name code')
            .populate('manager', 'fullName email');

        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        res.status(200).json({ success: true, data: branch });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc   Delete a branch
// @route  DELETE /api/district-branches/:id
// @access Superadmin
exports.deleteBranch = async (req, res) => {
    try {
        const branch = await DistrictBranch.findByIdAndDelete(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        res.status(200).json({ success: true, message: 'Branch deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
