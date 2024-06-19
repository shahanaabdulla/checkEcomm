const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');

const offerLoad = async (req, res) => {
    try {
        const offers = await Offer.find().populate('product').populate('categories');
        const categories = await Category.find();
        const products = await Product.find().populate('offer');
        res.render('./admin/offer', { offers, categories, products, layout: './admin/admin-layout' });
    } catch (error) {
        console.log(error.message);
    }
};

const offerCreate = async (req, res) => {
    try {
        const { name, discountPercentage, startDate, endDate } = req.body;

        // Validate the required fields
        if (!name || !discountPercentage || !startDate || !endDate) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const newOffer = new Offer({
            name,
            discountPercentage,
            startDate,
            endDate,

        });

        // Save the offer to the database
        await newOffer.save();

        res.status(201).json({ message: 'Offer created successfully', offer: newOffer });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const offerEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, discountPercentage, startDate, endDate, product, category } = req.body;

        // Validate the required fields
        if (!name || !discountPercentage || !startDate || !endDate || !product || !category) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if product exists
        const productExists = await Product.findById(product);
        if (!productExists) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        // Check if category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ message: 'Invalid category ID' });
        }

        // Update the offer
        const updatedOffer = await Offer.findByIdAndUpdate(id, {
            name,
            discountPercentage,
            startDate,
            endDate,
            product,
            category
        }, { new: true });

        res.redirect('/offer');
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const offerDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // Update products with a direct offer applied
        await Product.updateMany(
            { 'offer._id': id },
            {
                $set: {
                    onOffer: false,
                    offerPrice: null,
                    offer: null
                }
            }
        );

        // Update products with a category offer applied
        await Product.updateMany(
            { 'categoryOffer': true, 'offer._id': id },
            {
                $set: {
                    categoryOffer: false,
                    offerPrice: null
                }
            }
        );

        // Update categories to remove the offer array
        await Category.updateMany(
            { 'offer._id': id },
            {
                $unset: { offer: "" }
            }
        );


        // Delete the offer from the Offer collection
        await Offer.findByIdAndDelete(id);

        res.redirect('/offer');
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const offerProductsGet = async (req, res) => {
    try {
        const { offerId } = req.params;
        const offer = await Offer.findById(offerId).populate('product categories');

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        // Fetch the products for the offer
        const offerProducts = await Product.find({ _id: { $in: offer.product } });

        // Fetch the products under the categories associated with the offer
        const categoryProducts = await Product.find({ category: { $in: offer.categories } });

        // Combine both sets of products
        const allProducts = [...offerProducts, ...categoryProducts];

        // Calculate discounted prices considering category offers
        const productsWithDiscount = await Promise.all(allProducts.map(async product => {
            let productDiscountPrice = Infinity;

            // Check if the product has a direct offer
            if (product.offer && product.offer._id.toString() === offerId) {
                productDiscountPrice = (product.price - (product.price * (offer.discountPercentage / 100))).toFixed(2);
            }

            // Check if the product has a category offer
            if (product.category) {
                const category = await Category.findById(product.category);

                if (category && category.offer) {
                    const categoryDiscountPrice = (product.price - (product.price * (category.offer.discountPercentage / 100))).toFixed(2);

                    // Take the lower price between product offer and category offer
                    productDiscountPrice = Math.min(productDiscountPrice, categoryDiscountPrice);
                }
            }

            // Ensure that if no discount was applied, the discount price is the original price
            if (productDiscountPrice === Infinity) {
                productDiscountPrice = product.price;
            }

            return {
                ...product._doc,
                discountPrice: productDiscountPrice
            };
        }));

        res.render('offerPage', { offer, products: productsWithDiscount });
    } catch (error) {
        console.error('Error fetching offer products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



const productOffer = async (req, res) => {
    try {
        const { productId } = req.params;
        const { offerId, discountPercentage } = req.body;
        console.log(discountPercentage)
        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find the offer by ID
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        // Calculate the discount amount
        const discountAmount = (discountPercentage / 100);

        // Calculate offer price
        const offerPrice = product.price - (product.price * discountAmount);

        // Update product details with the offer information
        product.onOffer = true;
        product.offerPrice = offerPrice;
        product.offer = offer._id;

        // Save the updated product
        await product.save();

        // Add the product to the offer's product array if not already present
        if (!offer.product.includes(product._id)) {
            offer.product.push(product._id);
            await offer.save();
        }

        res.status(200).json({ message: 'Offer applied successfully', product, offer });
    } catch (error) {
        console.error('Error applying offer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.params;

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if the product has an associated offer
        if (product.offer && product.offer._id) {
            const offer = await Offer.findById(product.offer._id);
            if (offer) {
                // Remove the product from the offer's product array
                offer.product = offer.product.filter(prodId => prodId.toString() !== productId);
                await offer.save();
            }
        }

        // Remove offer details from the product
        product.onOffer = false;
        product.offerPrice = null;
        product.offer = null;

        // Save the updated product
        await product.save();

        res.status(200).json({ message: 'Offer removed successfully', product });
    } catch (error) {
        console.error('Error removing offer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const applyCategoryOffer = async (req, res) => {
    const { categoryId } = req.params;
    const { offerId, discountPercentage } = req.body;

    try {
        // Find the offer by ID
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        // Update the category with the offer
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Calculate offer price from discount percentage
        const productsToUpdate = await Product.find({ category: categoryId });

        for (const product of productsToUpdate) {
            const discountedPrice = product.price * (1 - discountPercentage / 100);
            product.categoryOffer = true;
            product.categoryOfferPrice = discountedPrice;
            await product.save();
        }

        // Update the offer details in the category
        category.offer = {
            _id: offer._id,
            name: offer.name,
            discountPercentage: discountPercentage,
        };

        await category.save();

        // Add the category reference to the offer if it's not already present
        if (!offer.categories.includes(categoryId)) {
            offer.categories.push(categoryId);
            await offer.save();
        }

        res.status(200).json({ message: 'Offer applied successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while applying the offer' });
    }
};


const removeCategoryOffer = async (req, res) => {
    const { categoryId } = req.params;

    try {
        // Find the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Find the offer by ID if it exists
        if (category.offer && category.offer._id) {
            const offer = await Offer.findById(category.offer._id);
            if (offer) {
                // Remove the category from the offer's categories array
                offer.categories = offer.categories.filter(catId => catId.toString() !== categoryId);
                await offer.save();
            }
        }

        // Remove offer details from the category
        category.offer = undefined;

        // Save the updated category
        await category.save();

        // Update products under the category
        await Product.updateMany(
            { category: categoryId, categoryOffer: true },
            {
                $set: {
                    categoryOffer: false,
                    categoryOfferPrice: null
                }
            }
        );

        res.status(200).json({ message: 'Offer removed successfully' });
    } catch (error) {
        console.error('Error removing offer from category:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



module.exports = {
    offerLoad,
    offerCreate,
    offerEdit,
    offerDelete,
    offerProductsGet,
    productOffer,
    removeProductOffer,
    applyCategoryOffer,
    removeCategoryOffer
}