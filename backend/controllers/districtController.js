const District = require('../models/District');
const User = require('../models/User');

const supervisorIdValue = (value) => {
    if (!value) return '';
    return value._id ? value._id.toString() : value.toString();
};

const findOtherDistrictForSupervisor = async (supervisorId, excludeDistrictId) => {
    if (!supervisorId) return null;
    const query = { supervisor: supervisorId };
    if (excludeDistrictId) {
        query._id = { $ne: excludeDistrictId };
    }
    return District.findOne(query);
};

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
        const { name, code, supervisor, description, forceReassign } = req.body;

        if (!supervisor) {
            return res.status(400).json({ success: false, message: 'District supervisor is required' });
        }

        const alreadyManaging = await findOtherDistrictForSupervisor(supervisor);
        if (alreadyManaging) {
            if (!forceReassign) {
                return res.status(400).json({
                    success: false,
                    message: `This supervisor already manages ${alreadyManaging.name}. One supervisor can manage only one district.`
                });
            }
            alreadyManaging.supervisor = null;
            await alreadyManaging.save();
            await User.findByIdAndUpdate(supervisor, { district: '' });
        }

        const district = await District.create({
            name,
            code,
            supervisor,
            description
        });

        await User.findByIdAndUpdate(supervisor, { district: name });

        res.status(201).json({ success: true, data: district });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.supervisor) {
            return res.status(400).json({
                success: false,
                message: 'This supervisor already manages another district. One supervisor can manage only one district.'
            });
        }
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

        const nextSupervisorId = supervisor ? supervisorIdValue(supervisor) : '';
        const currentSupervisorId = supervisorIdValue(district.supervisor);

        if (nextSupervisorId !== currentSupervisorId) {
            if (nextSupervisorId) {
                const alreadyManaging = await findOtherDistrictForSupervisor(nextSupervisorId, district._id);
                if (alreadyManaging) {
                    return res.status(400).json({
                        success: false,
                        message: `This supervisor already manages ${alreadyManaging.name}. One supervisor can manage only one district.`
                    });
                }
                await User.findByIdAndUpdate(nextSupervisorId, { district: name || district.name });
            }

            if (currentSupervisorId) {
                await User.findByIdAndUpdate(currentSupervisorId, { district: '' });
            }
        }

        if (name && name !== district.name) {
            await User.updateMany({ district: district.name }, { district: name });
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
        if (error.code === 11000 && error.keyPattern?.supervisor) {
            return res.status(400).json({
                success: false,
                message: 'This supervisor already manages another district. One supervisor can manage only one district.'
            });
        }
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

// @desc    Swap supervisors between two districts
// @route   POST /api/districts/switch-supervisors
// @access  Private/Admin
const switchSupervisors = async (req, res) => {
    try {
        const { districtAId, districtBId } = req.body;
        if (!districtAId || !districtBId || districtAId === districtBId) {
            return res.status(400).json({
                success: false,
                message: 'Select two different districts to switch supervisors.'
            });
        }

        const [districtA, districtB] = await Promise.all([
            District.findById(districtAId),
            District.findById(districtBId)
        ]);

        if (!districtA || !districtB) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }

        const supervisorA = districtA.supervisor ? supervisorIdValue(districtA.supervisor) : null;
        const supervisorB = districtB.supervisor ? supervisorIdValue(districtB.supervisor) : null;

        if (!supervisorA && !supervisorB) {
            return res.status(400).json({
                success: false,
                message: 'Neither district has a supervisor to switch.'
            });
        }

        districtA.supervisor = supervisorB || null;
        districtB.supervisor = supervisorA || null;
        await districtA.save();
        await districtB.save();

        if (supervisorA) {
            await User.findByIdAndUpdate(supervisorA, { district: districtB.name });
        }
        if (supervisorB) {
            await User.findByIdAndUpdate(supervisorB, { district: districtA.name });
        }

        const [updatedA, updatedB] = await Promise.all([
            District.findById(districtA._id).populate('supervisor', 'fullName role'),
            District.findById(districtB._id).populate('supervisor', 'fullName role')
        ]);

        res.status(200).json({
            success: true,
            message: `Supervisors switched between ${districtA.name} and ${districtB.name}.`,
            data: { districtA: updatedA, districtB: updatedB }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDistricts,
    createDistrict,
    updateDistrict,
    deleteDistrict,
    switchSupervisors
};
