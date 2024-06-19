const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    isDeletd:{
        type:Boolean,
        default:false
        
    },
    offer: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
        name: String,
        discountPercentage: Number
    }
})

module.exports = mongoose.model('Category', categorySchema);