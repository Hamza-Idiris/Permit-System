const RenewType = require('../models/RenewType');

const getRenewTypes = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: { $ne: false } };
    const types = await RenewType.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createRenewType = async (req, res) => {
  try {
    const { name, feeMultiplier, isPerFloor, isActive } = req.body;
    if (!name || feeMultiplier === undefined) {
      return res.status(400).json({ success: false, message: 'Name and fee multiplier are required' });
    }
    const existing = await RenewType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Renew type with this name already exists' });
    }
    const type = await RenewType.create({
      name,
      feeMultiplier,
      isPerFloor: isPerFloor || false,
      isActive: isActive !== undefined ? isActive : true
    });
    res.status(201).json({ success: true, message: 'Renew type created', data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRenewType = async (req, res) => {
  try {
    const type = await RenewType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Renew type not found' });
    const { name, feeMultiplier, isPerFloor, isActive } = req.body;
    if (name && name !== type.name) {
      const existing = await RenewType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ success: false, message: 'Renew type with this name already exists' });
      }
    }
    type.name = name || type.name;
    if (feeMultiplier !== undefined) type.feeMultiplier = feeMultiplier;
    if (isPerFloor !== undefined) type.isPerFloor = isPerFloor;
    if (isActive !== undefined) type.isActive = isActive;
    await type.save();
    res.status(200).json({ success: true, message: 'Renew type updated', data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteRenewType = async (req, res) => {
  try {
    const type = await RenewType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Renew type not found' });
    await type.deleteOne();
    res.status(200).json({ success: true, message: 'Renew type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getRenewTypes, createRenewType, updateRenewType, deleteRenewType };
