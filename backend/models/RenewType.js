const mongoose = require('mongoose');

const renewTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    unique: true,
    trim: true
  },
  feeMultiplier: {
    type: Number,
    required: [true, 'Fee multiplier is required'],
    default: 0.0
  },
  isPerFloor: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('RenewType', renewTypeSchema);
