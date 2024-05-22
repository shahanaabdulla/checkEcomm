const path = require('path')
const multer = require('multer')
const sharp = require('sharp');

// Multer configuration for handling single and multiple file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/productImages'); // Set the destination folder for storing uploaded images
  },
  filename: (req, file, cb) => {
    // Generate a unique filename for the uploaded file
    console.log(Date.now());
    console.log(path.extname(file.originalname));
    cb(null,file.originalname +'.webp');
  },
});

const uploads = multer({ storage: storage });
  




const Product = require('../models/productModel');

const resizeImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const productId = req.params.productId; // Assuming you have product ID in your route
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const filename = req.files['image'][0].filename;
    const imagePath = `public/productImages/${filename}`; // Adjust the path as needed
    const resizedImagePath = imagePath.replace(/\.[^/.]+$/, "") + '_small.jpg'; // Appending '_small' to filename
    await sharp(imagePath)
      .resize({ width: 200 }) // Set desired width for the resized image
      .toFile(resizedImagePath);
    req.file.path = resizedImagePath; // Update file path to point to the resized image
    next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { uploads, resizeImage };