const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the schema for wallet transactions
const walletTransactionSchema = mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'], // Ensure the type is either 'credit' or 'debit'
        required: true
    },
    date: {
        type: Date,
        default: Date.now // Automatically set the date of the transaction
    },
    description: {
        type: String,
        required: true
    }
});

// Define the main user schema
const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    is_verified: {
        type: Number,
        default: 0
    },
    otp: {
        type: String,
        default: null
    },
    block: {
        type: Boolean,
        default: false
    },
    loggedIn: {
        type: Boolean,
        default: false
    },
    walletBalance:{
        type:Number,
        required:true
    },
    wallet: {
        type: [walletTransactionSchema], // Include the wallet transactions schema as an array
        default: [] // Initialize with an empty array
    }
});

module.exports = mongoose.model('Users', userSchema);
