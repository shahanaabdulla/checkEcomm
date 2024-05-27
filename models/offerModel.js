// models/Offer.js

const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    discountPercentage: { type: Number, required: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    product: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Correct capitalization for Product model
        required: true // Ensure each product entry is required
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", // Correct capitalization for Category model
        required: true
    }
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;


