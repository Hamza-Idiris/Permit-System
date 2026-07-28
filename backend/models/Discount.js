const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // type = one building/reno/renew type name; category = all of a requestType
  scope: {
    type: String,
    enum: ['type', 'category'],
    required: true
  },
  requestType: {
    type: String,
    enum: ['New Construction', 'Renovation', 'Renew', ''],
    default: ''
  },
  typeName: {
    type: String,
    default: '' // e.g. Jiingad when scope=type
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
