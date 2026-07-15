const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'District name is required'],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: [true, 'District code is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('District', districtSchema);
