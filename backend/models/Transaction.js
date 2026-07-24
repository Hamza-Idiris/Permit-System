const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    applicationRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PermitApplication',
        required: false // in case older payment flows didn't pass app ID
    },
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Success', 'Failed', 'Pending'],
        default: 'Pending'
    },
    paymentMode: {
        type: String,
        enum: ['Live', 'Sandbox'],
        default: 'Live'
    },
    auditLog: [{
        event: String,
        timestamp: Date,
        details: Object
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
