const mongoose = require('mongoose');

const districtBranchSchema = new mongoose.Schema({
    district: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'District',
        required: [true, 'District is required']
    },
    name: {
        type: String,
        required: [true, 'Branch name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Branch code is required'],
        trim: true,
        uppercase: true
    },
    address: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DistrictBranch', districtBranchSchema);
