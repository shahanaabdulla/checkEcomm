const express = require('express');
const router = express.Router();
const Product = require('../models/productModel'); 
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');

const offerLoad = async (req, res) => {
    try {
        const offers = await Offer.find().populate('product').populate('category');
        const categories = await Category.find();
        const products = await Product.find();
        res.render('./admin/offer', { offers, categories, products, layout: './admin/admin-layout' });
    } catch (error) {
        console.log(error.message);
    }
};


 

const offerCreate = async (req, res) => {
    try {
        const { name, discountPercentage, startDate, endDate, product, category } = req.body;

        // Validate the required fields
        if (!name || !discountPercentage || !startDate || !endDate || !product || !category) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Ensure product is an array
        if (!Array.isArray(product) || product.length === 0) {
            return res.status(400).json({ message: 'Product field must be a non-empty array' });
        }

        // Check if all products exist
        const productsExist = await Product.find({ _id: { $in: product } });
        if (productsExist.length !== product.length) {
            return res.status(400).json({ message: 'One or more product IDs are invalid' });
        }

        // Check if category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ message: 'Invalid category ID' });
        }

        // Calculate discount amount
        const discountAmount = (discountPercentage / 100);

        // Update products with offer details
        await Promise.all(productsExist.map(async (product) => {
            // Calculate offer price
            const offerPrice = product.price - (product.price * discountAmount);
            
            // Update product details
            product.onOffer = true;
            product.offerPrice = offerPrice;
            
            // Save the updated product
            await product.save();
        }));

        // Create a new offer object
        const newOffer = new Offer({
            name,
            discountPercentage,
            startDate,
            endDate,
            product,
            category
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

  const offerDelete= async (req, res) => {
    try {
      const { id } = req.params;
      await Offer.findByIdAndDelete(id);
      res.redirect('/offer');
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };


  const offerProductsGet=async (req, res) => {
    try {
        const { offerId } = req.params;
        const offer = await Offer.findById(offerId).populate('product category');

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        // Fetch the products for the offer
        const products = await Product.find({ _id: { $in: offer.product } });

        // Calculate discounted prices
        const productsWithDiscount = products.map(product => {
            const discountPrice = (product.price - (product.price * (offer.discountPercentage / 100))).toFixed(2);
            return {
                ...product._doc,
                discountPrice
            };
        });

        res.render('offerPage', { offer, products: productsWithDiscount });
    } catch (error) {
        console.error('Error fetching offer products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports={
    offerLoad,
    offerCreate,
    offerEdit,
    offerDelete,
    offerProductsGet
}