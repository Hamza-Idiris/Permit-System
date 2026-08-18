const District = require('../models/District');
const User = require('../models/User');

// @desc    Get all districts
// @route   GET /api/districts
// @access  Private
const getDistricts = async (req, res) => {
    try {
        const query = req.user?.role === 'superadmin' ? {} : { isActive: { $ne: false } };
        const districts = await District.find(query).populate('supervisor', 'fullName role');
        res.status(200).json({ success: true, count: districts.length, data: districts });
    } catch (error) {
        res.status(500).json({ success: true, message: error.message });
    }
};

// @desc    Create new district
// @route   POST /api/districts
// @access  Private/Admin
const createDistrict = async (req, res) => {
    try {
        const { name, code, supervisor, description } = req.body;

        if (!supervisor) {
            return res.status(400).json({ success: false, message: 'District supervisor is required' });
        }

        const district = await District.create({
            name,
            code,
            supervisor,
            description
        });

        // If supervisor is assigned, update user's district field
        if (supervisor) {
            await User.findByIdAndUpdate(supervisor, { district: name });
        }

        res.status(201).json({ success: true, data: district });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update district
// @route   PUT /api/districts/:id
// @access  Private/Admin
const updateDistrict = async (req, res) => {
    try {
        const { name, code, supervisor, description, isActive } = req.body;
        let district = await District.findById(req.params.id);

        if (!district) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }

        // Handle supervisor change
        if (supervisor && supervisor !== district.supervisor?.toString()) {
            // Update new supervisor
            await User.findByIdAndUpdate(supervisor, { district: name });
            // Optionally reset old supervisor's district? 
            // For now we just update the new one.
        }

        const updatePayload = {
            name,
            code,
            supervisor: supervisor || null,
        };
        if (description !== undefined) {
            updatePayload.description = description;
        }
        if (typeof isActive === 'boolean') {
            updatePayload.isActive = isActive;
        }

        district = await District.findByIdAndUpdate(req.params.id, updatePayload, { new: true, runValidators: true });

        res.status(200).json({ success: true, data: district });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete district
// @route   DELETE /api/districts/:id
// @access  Private/Admin
const deleteDistrict = async (req, res) => {
    try {
        const district = await District.findById(req.params.id);

        if (!district) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }

        // Free all staff/users assigned to this district so they no longer appear as hired
        await User.updateMany(
            { district: district.name },
            { $set: { district: '' } }
        );

        await district.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDistricts,
    createDistrict,
    updateDistrict,
    deleteDistrict
};
