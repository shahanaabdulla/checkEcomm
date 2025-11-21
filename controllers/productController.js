const Product = require('../models/productModel');
const Category = require('../models/categoryModel')
const { validationResult } = require('express-validator');
const fs = require('fs')
const multer = require('multer')
const path = require('path');
const categoryModel = require('../models/categoryModel');
const mongoose = require('mongoose')
const Wishlist = require('../models/wishlistModel');
const Offer = require('../models/offerModel')



const productAdd = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('./admin/createProduct.hbs', { layout: './admin/admin-layout', categories })
  } catch (error) {
    console.log(error.message)
  }
}


const getProducts = async (req, res) => {
  try {
    // Fetch products and populate the 'offer' field
    const productData = await Product.find().populate('offer').lean();

    // Fetch all offers
    const offers = await Offer.find().lean();
    
    // Render the product list with offers
    res.render('./admin/productList', { offers, products: productData, layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const addProduct = async (req, res, next) => {
  try {
    // Extract data from the request body
    const { name, description, color, brand, category, size, price, stock, isFeatured } = req.body;
    if (price <= 0 || stock < 0) {
      return res.render('./admin/createProduct', { message: "Price and stock should be greater than 0", layout: './admin/admin-layout' });
    }

    // Get the main image filename
    // const mainImage = req.files['image'].filename;

    // Get an array of image filenames
    const imageArray = req.files['images'].map(file => file.filename);

    // Get the cropped image data
    const croppedImageData = req.body.croppedImage;

    // Save the product to the database
    const newProduct = new Product({
      name,
      description,
      color,
      brand,
      category,
      size,
      price,
      stock,
      brand,
      image: croppedImageData,
      images: imageArray,
      isFeatured,
      // Add cropped image data to the product object

    });

    const savedProduct = await newProduct.save();

    console.log(savedProduct);
    console.log("Success");
    res.redirect('/admin/productList');

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



const editProduct = async (req, res) => {

  try {
    const id = req.params.id;
    const productData = await Product.find({ _id: id }).populate('category').lean();
    const categories = await Category.find().lean()


    console.log(productData);
    if (productData) {
      res.render("./admin/edit-product", { productData, categories, layout: './admin/admin-layout' });
    } else {
      res.redirect("/admin/productList");
    }
  } catch (error) {
    console.log(error);
  }
};



const updateProduct = async (req, res) => {
  try {
    // Extract data from the request body
    const { name, description, category, size, price, stock, isFeatured } = req.body;
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const foundCategory = await Category.findOne({ name: category }).lean();

    // Get the main image filename if provided
    const mainImage = req.files['image'] ? req.files['image'][0].filename : product.image;

    const newImages = req.files['images'] ? req.files['images'].map(file => file.filename) : [];
    let imageArray = product.images.concat(newImages);

    const croppedImageData = req.body.croppedImage || product.image;

    // Create the update object
    const updateObject = {
      name,
      description,
      size,
      price,
      stock,
      category: foundCategory._id,
      image: croppedImageData,
      images: imageArray,
      isFeatured
    };

    // If the main image is not updated, retain the existing one
    if (!req.files['image']) {
      updateObject.image = product.image;
    }

    // Find and update the product by id
    await Product.updateOne(
      { _id: req.params.id },
      { $set: updateObject }
    );

    // Render the updated product list
    const productData = await Product.find().populate('offer').lean();
    console.log(productData);

    if (productData)
      res.render("./admin/productList", { products: productData, layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id
    const product = await Product.findOneAndUpdate({ _id: (productId) }, { $set: { isDeleted: true } })
    console.log(product)

    await product.save();

    const productData = await Product.find().lean();
    console.log(productData);

    res.render("./admin/productList", { products: productData, layout: './admin/admin-layout' });
  } catch (error) {
    return res.status(400).json({
      success: false,
      msg: error.message
    })

  }
}

function generatePaginationButtons(currentPage, totalPages) {
  const buttons = [];
  for (let i = 1; i <= totalPages; i++) {
    buttons.push(i);
  }
  return buttons;
}



const getAllProducts = async (req, res) => {
  try {
    const user = req.session.user_id

    const currentPage = parseInt(req.query.page) || 1; // Default to page 1
    const itemsPerPage = 5; // Adjust as needed

    // Calculate skip and limit values based on page number and items per page
    const skip = (currentPage - 1) * itemsPerPage;
    const limit = itemsPerPage;

    // Get total product count 
    const totalProductsCount = await Product.countDocuments({ isDeleted: false });

    // Find products with pagination and filtering
    const products = await Product.find({ isDeleted: false })
      .skip(skip)
      .limit(limit);


    const totalPages = Math.ceil(totalProductsCount / itemsPerPage);
    const paginationButtons = generatePaginationButtons(currentPage, totalPages);
    res.render('products', {
      products,
      currentPage,
      totalPages,
      paginationButtons,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};


const getProductDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const user = req.session.user_id
    const product = await Product.findOne({ _id: id }).populate('category'); // Populate the 'category' field




    if (!product) {
      // Handle case where product is not found
      return res.status(404).send('Product not found');
    }

    function generateBreadcrumbs(product) {
      // Assuming product has a category property
      const category = product.category.name; // Access category name
      const breadcrumbs = [
        { label: 'Home', url: '/home' },
        { label: 'Products', url: '/products' },
        { label: category, url: `/${category}` },
        { label: product.name, url: `/products/${product._id}` }
      ];
      return breadcrumbs;
    }


    const breadcrumbs = generateBreadcrumbs(product);
    const products = await Product.find({ _id: id }).populate('category')
    res.render('product-details.hbs', { products, breadcrumbs, user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const getProductsUnderWomenCategory = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1; // Default to page 1
    const itemsPerPage = 5; // Adjust as needed

    // Find the women category
    const womenCategory = await Category.findOne({ name: 'women' });

    if (!womenCategory) {
      return res.status(404).json({ message: "Category 'women' not found" });
    }

    // Calculate skip and limit values based on page number and items per page
    const skip = (currentPage - 1) * itemsPerPage;

    // Get total product count for the women category
    const totalProductsCount = await Product.countDocuments({ category: womenCategory._id, isDeleted: false });

    // Find products with pagination
    const products = await Product.find({ category: womenCategory._id, isDeleted: false })
      .skip(skip)
      .limit(itemsPerPage);

    // Calculate total pages
    const totalPages = Math.ceil(totalProductsCount / itemsPerPage);

    // Generate pagination buttons
    const paginationButtons = generatePaginationButtons(currentPage, totalPages);

    res.render('womenProducts', {
      products,
      currentPage,
      totalPages,
      paginationButtons,
    });
  } catch (err) {
    console.error('Error fetching products under women category:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const getProductsUndermenCategory = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 5;  // Adjust this number based on your preference

    const menCategory = await Category.findOne({ name: 'men' });

    if (!menCategory) {
      return res.status(404).json({ message: "Category 'men' not found" });
    }

    const skip = (currentPage - 1) * itemsPerPage;
    const totalProductsCount = await Product.countDocuments({ category: menCategory._id, isDeleted: false });
    const products = await Product.find({ category: menCategory._id, isDeleted: false })
      .skip(skip)
      .limit(itemsPerPage);

    const totalPages = Math.ceil(totalProductsCount / itemsPerPage);
    const paginationButtons = generatePaginationButtons(currentPage, totalPages);

    res.render('menProducts', {
      products,
      currentPage,
      totalPages,
      paginationButtons,
    });
  } catch (err) {
    console.error('Error fetching products under men category:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
const sortFun = (products, sortby) => {

}


// Define a route to handle sorting requests
const sortProducts = async (req, res) => {
  const sortBy = req.params.criteria;
  const currentPage = parseInt(req.query.page) || 1;
  const itemsPerPage = 5;
  const skip = (currentPage - 1) * itemsPerPage;
  const limit = itemsPerPage;

  try {
    const totalProductsCount = await Product.countDocuments({ isDeleted: false });
    let products = await Product.find({ isDeleted: false }).lean();

    const getEffectivePrice = (product) => {
      return product.onOffer ? product.offerPrice : product.price;
    };

    switch (sortBy) {
      case 'popularity':
        // Sort by popularity
        break;
      case 'priceLowToHigh':
        products.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case 'priceHighToLow':
        products.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case 'averageRatings':
        // Sort by average ratings
        break;
      case 'featured':
        products.sort((a, b) => (a.isFeatured && !b.isFeatured ? -1 : !a.isFeatured && b.isFeatured ? 1 : 0));
        break;
      case 'aToZ':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'zToA':
        products.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newArrivals':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        // Default sorting
        break;
    }
    
    products = products.slice(skip, skip + limit);

    const totalPages = Math.ceil(totalProductsCount / itemsPerPage);
    const paginationButtons = generatePaginationButtons(currentPage, totalPages);

    res.render('products', {
      products,
      currentPage,
      totalPages,
      paginationButtons
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};




// Backend route for handling search requests
const searchProduct = async (req, res) => {
  const query = req.query.q;
  const sortBy = req.query.sortBy;
  const currentPage = parseInt(req.query.page) || 1;
  const itemsPerPage = 5;
  const skip = (currentPage - 1) * itemsPerPage;
  const limit = itemsPerPage;

  try {
    const getEffectivePrice = (product) => {
      return product.onOffer ? product.offerPrice : product.price;
    };

    let products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ],
      active: true
    });

    if (sortBy) {
      switch (sortBy) {
        case 'popularity':
          // Sort by popularity
          break;
        case 'priceLowToHigh':
          products.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
          break;
        case 'priceHighToLow':
          products.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
          break;
        case 'averageRatings':
          // Sort by average ratings
          break;
        case 'featured':
          products.sort((a, b) => (a.isFeatured && !b.isFeatured ? -1 : !a.isFeatured && b.isFeatured ? 1 : 0));
          break;
        case 'aToZ':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'zToA':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'newArrivals':
          products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        default:
          // Default sorting
          break;
      }
    }

    const totalProductsCount = products.length;
    products = products.slice(skip, skip + limit);

    const totalPages = Math.ceil(totalProductsCount / itemsPerPage);
    const paginationButtons = generatePaginationButtons(currentPage, totalPages);

    res.render('products', {
      products,
      currentPage,
      totalPages,
      paginationButtons
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Define route for handling filter requests
const filterProducts = async (req, res) => {
  try {
    // Extract filter parameters from query string
    const { price, color, size } = req.query;

    // Construct query object based on filter parameters
    const query = {};
    if (price) query.price = price;
    if (color) query.color = color;
    if (size) query.size = size;

    // Fetch products matching the filters
    const filteredProducts = await Product.find(query);

    // Send filtered products as JSON response
    res.json(filteredProducts);
  } catch (error) {
    console.error('Error fetching filtered products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const imageDeleteUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;

    // Find the product by ID
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Remove the image from the images array
    product.images = product.images.filter(image => image !== filename);

    // Save the updated product
    await product.save();

    res.json({ message: 'Image removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const calcTotal = async (req, res) => {
  try {
    const productId = req.params.productId;
    const quantity = parseInt(req.query.quantity);

    // Find the product in the database by ID
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      throw new Error('Product not found');
    }

    // Determine the price to use for calculation
    let priceForCalculation = 0;
    if (product.offerPrice && product.categoryOfferPrice) {
      // If both offerPrice and categoryOfferPrice exist, use the least one
      priceForCalculation = Math.min(product.offerPrice, product.categoryOfferPrice);
    } else if (product.offerPrice) {
      // If only offerPrice exists, use that
      priceForCalculation = product.offerPrice;
    } else if (product.categoryOfferPrice) {
      // If only categoryOfferPrice exists, use that
      priceForCalculation = product.categoryOfferPrice;
    } else {
      // Otherwise, use the actual price
      priceForCalculation = product.price;
    }

    // Calculate total price based on selected price and quantity
    const totalPrice = priceForCalculation * quantity;

    // Send the total price as JSON response
    res.json(totalPrice);
  } catch (error) {
    // Handle errors
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



module.exports = {

  addProduct,
  productAdd,
  getProducts,
  editProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductDetails,
  getProductsUnderWomenCategory,
  getProductsUndermenCategory,
  sortProducts,
  searchProduct,
  filterProducts,
  imageDeleteUpdate,
  calcTotal

}