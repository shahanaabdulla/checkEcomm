const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User collection
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Reference to the Product collection
        required: true
    }
});

module.exports = mongoose.model('Wishlist', wishlistSchema);


