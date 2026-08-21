const mongoose = require('mongoose');

const renovationTypeSchema = new mongoose.Schema({
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
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RenovationType', renovationTypeSchema);
