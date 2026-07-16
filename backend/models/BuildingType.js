const mongoose = require('mongoose');

const buildingTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  feeMultiplier: {
    type: Number,
    required: true,
    default: 0.0
  },
  isPerFloor: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BuildingType', buildingTypeSchema);
