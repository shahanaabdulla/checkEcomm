
const Product = require('../models/productModel');
const Wishlist = require('../models/wishlistModel');
const Cart = require('../models/cartModel');
const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const updatedWishlist = await Wishlist.find({ user: userId }).populate('product');
        res.render('wishlist', { products: updatedWishlist })
    } catch (error) {
        console.log(error.message);
    }
};

// Controller function to add a product to the wishlist
const addToWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user_id;
        console.log(productId)
        console.log(userId)
        // Check if the user already has the product in the wishlist
        const existingWishlistItem = await Wishlist.findOne({ user: userId, product: productId });

        if (existingWishlistItem) {
            return res.status(400).json({ message: 'Product already exists in the wishlist' });
        }

        // Create a new wishlist item
        const wishlistItem = new Wishlist({
            user: userId,
            product: productId
        });

        // Save the wishlist item to the database
        await wishlistItem.save();
        await Product.updateOne({ _id: productId }, { isWishlisted: true });
        // Render wishlist page with updated wishlist items
        const updatedWishlist = await Wishlist.find({ user: userId }).populate('product');
        res.status(200).json({ message: 'Product added to wishlist successfully', wishlist: updatedWishlist });
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).json({ message: 'Internal server error' }); // Sending JSON error response
    }
};

const moveToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;

        // Find the wishlist item
        const wishlistItem = await Wishlist.findOne({ user: userId, product: productId }).populate('product');
        if (!wishlistItem) {
            console.log("Item not found in wishlist.");
            req.flash('error_msg', "Item not found in wishlist.");
            return res.redirect('/wishlist');
        }

        // Remove the item from the wishlist
        await Wishlist.deleteOne({ user: userId, product: productId });

        // Add the product to the user's cart with quantity 1
        const cart = await Cart.findOneAndUpdate(
            { user_id: userId },
            {
                $addToSet: { // Add to set ensures uniqueness, so product won't be added twice
                    products: { product: wishlistItem.product._id, quantity: 1 } // Add product with quantity 1
                }
            },
            { upsert: true, new: true } // Ensure the cart is created if it doesn't exist and return the updated cart
        );
        await Product.updateOne({ _id: productId }, { isWishlisted: false });
        console.log(`Moved ${wishlistItem.product.name} to cart.`);
        req.flash('success_msg', `Moved ${wishlistItem.product.name} to cart.`);

        // Render wishlist page with updated wishlist items
        const updatedWishlist = await Wishlist.find({ user: userId }).populate('product');
        const successMsg = req.flash('success_msg');
        res.render('wishlist', { products: updatedWishlist, successMsg });
    } catch (error) {
        console.error("Error moving item to cart:", error);
        req.flash('error_msg', 'Internal Server Error');
        res.redirect('/wishlist');
    }
};

const removeWishlist = async (req, res) => {
    const productId = req.params.productId;

    try {

        const removedItem = await Wishlist.findOneAndDelete({ product: productId });
        await Product.updateOne({ _id: productId }, { isWishlisted: false });

        if (!removedItem) {
            // If the item was not found in the wishlist
            return res.status(404).json({ error: 'Item not found in wishlist' });
        }

        // If the item was successfully removed from the wishlist
        return res.status(200).json({ message: 'Item removed from wishlist' });
    } catch (error) {
        // If an error occurred during the removal process
        console.error('Error removing item from wishlist:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    loadWishlist,
    addToWishlist,
    moveToCart,
    removeWishlist
}