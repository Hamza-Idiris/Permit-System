const BuildingType = require('../models/BuildingType');

// Get all building types
const getBuildingTypes = async (req, res) => {
  try {
    const buildingTypes = await BuildingType.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: buildingTypes });
  } catch (error) {
    console.error('Error fetching building types:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new building type
const createBuildingType = async (req, res) => {
  try {
    const { name, feeMultiplier, isPerFloor } = req.body;

    if (!name || feeMultiplier === undefined) {
      return res.status(400).json({ success: false, message: 'Name and fee multiplier are required' });
    }

    const existingType = await BuildingType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingType) {
      return res.status(400).json({ success: false, message: 'Building type with this name already exists' });
    }

    const buildingType = await BuildingType.create({
      name,
      feeMultiplier,
      isPerFloor: isPerFloor || false
    });

    res.status(201).json({ success: true, message: 'Building type created successfully', data: buildingType });
  } catch (error) {
    console.error('Error creating building type:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a building type
const updateBuildingType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, feeMultiplier, isPerFloor } = req.body;

    const buildingType = await BuildingType.findById(id);
    if (!buildingType) {
      return res.status(404).json({ success: false, message: 'Building type not found' });
    }

    // Check if name is taken by another type
    if (name && name !== buildingType.name) {
      const existingType = await BuildingType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existingType && existingType._id.toString() !== id) {
        return res.status(400).json({ success: false, message: 'Building type with this name already exists' });
      }
    }

    buildingType.name = name || buildingType.name;
    if (feeMultiplier !== undefined) buildingType.feeMultiplier = feeMultiplier;
    if (isPerFloor !== undefined) buildingType.isPerFloor = isPerFloor;

    await buildingType.save();

    res.status(200).json({ success: true, message: 'Building type updated successfully', data: buildingType });
  } catch (error) {
    console.error('Error updating building type:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a building type
const deleteBuildingType = async (req, res) => {
  try {
    const { id } = req.params;

    const buildingType = await BuildingType.findById(id);
    if (!buildingType) {
      return res.status(404).json({ success: false, message: 'Building type not found' });
    }

    await buildingType.deleteOne();

    res.status(200).json({ success: true, message: 'Building type deleted successfully' });
  } catch (error) {
    console.error('Error deleting building type:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getBuildingTypes,
  createBuildingType,
  updateBuildingType,
  deleteBuildingType
};
