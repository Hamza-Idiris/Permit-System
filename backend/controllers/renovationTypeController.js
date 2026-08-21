const RenovationType = require('../models/RenovationType');

// Get all renovation types (active by default, or all if includeInactive=true)
const getRenovationTypes = async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const filter = includeInactive === 'true' ? {} : { isActive: { $ne: false } };
        const renovationTypes = await RenovationType.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: renovationTypes });
    } catch (error) {
        console.error('Error fetching renovation types:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new renovation type
const createRenovationType = async (req, res) => {
    try {
        const { name, feeMultiplier, isPerFloor, isActive } = req.body;

        if (!name || feeMultiplier === undefined) {
            return res.status(400).json({ success: false, message: 'Name and fee multiplier are required' });
        }

        const existingType = await RenovationType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingType) {
            return res.status(400).json({ success: false, message: 'Renovation type with this name already exists' });
        }

        const renovationType = await RenovationType.create({
            name,
            feeMultiplier,
            isPerFloor: isPerFloor || false,
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({ success: true, message: 'Renovation type created successfully', data: renovationType });
    } catch (error) {
        console.error('Error creating renovation type:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update a renovation type
const updateRenovationType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, feeMultiplier, isPerFloor, isActive } = req.body;

        const renovationType = await RenovationType.findById(id);
        if (!renovationType) {
            return res.status(404).json({ success: false, message: 'Renovation type not found' });
        }

        if (name && name !== renovationType.name) {
            const existingType = await RenovationType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (existingType && existingType._id.toString() !== id) {
                return res.status(400).json({ success: false, message: 'Renovation type with this name already exists' });
            }
        }

        renovationType.name = name || renovationType.name;
        if (feeMultiplier !== undefined) renovationType.feeMultiplier = feeMultiplier;
        if (isPerFloor !== undefined) renovationType.isPerFloor = isPerFloor;
        if (isActive !== undefined) renovationType.isActive = isActive;

        await renovationType.save();

        res.status(200).json({ success: true, message: 'Renovation type updated successfully', data: renovationType });
    } catch (error) {
        console.error('Error updating renovation type:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a renovation type
const deleteRenovationType = async (req, res) => {
    try {
        const { id } = req.params;

        const renovationType = await RenovationType.findById(id);
        if (!renovationType) {
            return res.status(404).json({ success: false, message: 'Renovation type not found' });
        }

        await renovationType.deleteOne();

        res.status(200).json({ success: true, message: 'Renovation type deleted successfully' });
    } catch (error) {
        console.error('Error deleting renovation type:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getRenovationTypes,
    createRenovationType,
    updateRenovationType,
    deleteRenovationType
};
