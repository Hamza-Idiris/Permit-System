const Discount = require('../models/Discount');

const getDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createDiscount = async (req, res) => {
  try {
    const { name, scope, requestType, typeName, discountPercent, isActive } = req.body;
    if (!name || !scope || discountPercent === undefined) {
      return res.status(400).json({ success: false, message: 'name, scope, and discountPercent are required' });
    }
    if (scope === 'type' && !typeName) {
      return res.status(400).json({ success: false, message: 'typeName is required for type discounts' });
    }
    if (scope === 'category' && !requestType) {
      return res.status(400).json({ success: false, message: 'requestType is required for category discounts' });
    }
    const discount = await Discount.create({
      name,
      scope,
      requestType: requestType || '',
      typeName: typeName || '',
      discountPercent: Number(discountPercent),
      isActive: isActive !== false
    });
    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ success: false, message: 'Discount not found' });
    const { name, scope, requestType, typeName, discountPercent, isActive } = req.body;
    if (name) discount.name = name;
    if (scope) discount.scope = scope;
    if (requestType !== undefined) discount.requestType = requestType;
    if (typeName !== undefined) discount.typeName = typeName;
    if (discountPercent !== undefined) discount.discountPercent = Number(discountPercent);
    if (isActive !== undefined) discount.isActive = isActive;
    await discount.save();
    res.status(200).json({ success: true, data: discount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ success: false, message: 'Discount not found' });
    await discount.deleteOne();
    res.status(200).json({ success: true, message: 'Discount deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Resolve best discount percent for a fee calculation */
const resolveDiscountPercent = async (requestType, typeName) => {
  const active = await Discount.find({ isActive: true });
  const typeMatch = active.find(
    d => d.scope === 'type' && d.typeName && typeName &&
      d.typeName.toLowerCase() === String(typeName).toLowerCase() &&
      (!d.requestType || d.requestType === requestType)
  );
  if (typeMatch) return Number(typeMatch.discountPercent) || 0;

  const catMatch = active.find(
    d => d.scope === 'category' && d.requestType === requestType
  );
  if (catMatch) return Number(catMatch.discountPercent) || 0;
  return 0;
};

module.exports = {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  resolveDiscountPercent
};
