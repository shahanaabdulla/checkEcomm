const Product = require('../models/productModel');
const Category=require('../models/categoryModel')
const { validationResult } = require('express-validator');
const fs=require('fs')
const multer=require('multer')
const path=require('path');
const categoryModel = require('../models/categoryModel');
const mongoose=require('mongoose')
const Wishlist = require('../models/wishlistModel');




const productAdd=async(req,res)=>{
    try {
      const categories = await Category.find();
        res.render('./admin/createProduct.hbs',{layout: './admin/admin-layout',categories})
    } catch (error) {
      console.log(error.message)  
    }
}




 

      

  const getProducts = async(req,res)=>{
    try{
      const productData = await Product.find();
      
       res.render('./admin/productList',{ products: productData,layout: './admin/admin-layout'})
    }catch(error){
       console.log(error.message)
    }
}
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
      const categories=await Category.find().lean()
    
      
      console.log(productData);
      if (productData) {
        res.render("./admin/edit-product", {productData,categories,layout: './admin/admin-layout'});
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
      const foundCategory = await Category.findOne({ name: category }).lean();
      // Get the main image filename
      // const mainImage = req.files['image'][0].filename;
      const imageArray = req.files['images'].map(file => file.filename);
      const croppedImageData = req.body.croppedImage;
  
      // Create the update object
      const updateObject = {
        name,
        description,
        size,
        price,
        stock,
        category: foundCategory._id,
        image:croppedImageData,
        images: imageArray,
        isFeatured
      };
  
      // Conditionally add croppedImage to the update object
      
  
      // Find and update the product by id
      await Product.updateOne(
        { _id: req.params.id },
        { $set: updateObject }
      );
  
      // Render the updated product list
      const productData = await Product.find().lean();
      console.log(productData);
  
      if (productData)
        res.render("./admin/productList", { products: productData, layout: './admin/admin-layout' });
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  

 

//   const deleteCategory= async (req, res) => {
//     try {
//         const category = await Category.findById(req.params.id);
//         if (!category) {
//             return res.status(404).json({ message: 'Category not found' });
//         }
//         category.isdeleted = true;
//         await category.save();
//         res.json({ message: 'Category soft deleted successfully' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

// const deleteCategory = async (req, res) => {
//   try {
   
//     await Category.find({ _id: req.params.id }).lean();
//     await Category.deleteOne({ _id: req.params.id  });
//     Category.isdeleted = true
//      await Category.save()
//     const categoryData= await Category.find().lean();
//     console.log(categoryData);

//     res.render("./admin/categoryList", {category: categoryData});
//   } catch (error) {
//     console.log(error.message);
//   }
// };
const deleteProduct=async(req,res)=>{
  try {
    const productId=req.params.id
    const product=await Product.findOneAndUpdate({_id:(productId)},{$set:{isDeleted:true}})
    console.log(product)
   
    await product.save();
    
    const productData= await Product.find().lean();
        console.log(productData);
    
        res.render("./admin/productList", {products: productData,layout: './admin/admin-layout'});
  } catch (error) {
      return res.status(400).json({
       success:false,
       msg:error.message
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
    const user=req.session.user_id
    
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



//  const getProductDetails = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const product = await Product.find({_id:id}).populate('category')

//     function  generateBreadcrumbs(product) {
//       // Assuming product has a category property
     
//       const category = product.category
//       console.log(category)
//       // Assuming you have a predefined breadcrumb structure
//       const breadcrumbs = [
//           { label: 'Home', url: '/home' },
//           { label: 'Products', url: '/products' },
//           { label: category, url: `/products/${category}` },
//           { label: product.name, url: `/products/${category}/${product._id}` }
//       ];
//       return breadcrumbs;
    
//     }
//     console.log(product)
//     const breadcrumbs = generateBreadcrumbs(product)
//     console.log(breadcrumbs)
//     res.render('product-details.hbs', { product,breadcrumbs });
   
//   }

  
     
//   catch (error) {
//       console.error(error);
//       res.status(500).send('Internal Server Error');
//   }
// };
const getProductDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const user=req.session.user_id
    const product = await Product.findOne({_id:id}).populate('category'); // Populate the 'category' field
    
   
   
    
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
    const products = await Product.find({_id:id}).populate('category')
    res.render('product-details.hbs', { products, breadcrumbs,user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const getProductsUnderWomenCategory = async (req, res) => {
  try {
      const womenCategory = await Category.findOne({ name: 'women' });

      if (!womenCategory) {
          return res.status(404).json({ message: "Category 'women' not found" });
      }

      const products = await Product.find({ category: womenCategory._id, isDeleted: false });

      res.render('womenProducts', { products });
  } catch (err) {
      console.error('Error fetching products under women category:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
};

const getProductsUndermenCategory = async (req, res) => {
  try {
      const menCategory = await Category.findOne({ name: 'men' });

      if (!menCategory) {
          return res.status(404).json({ message: "Category 'men' not found" });
      }

      const products = await Product.find({ category: menCategory._id, isDeleted: false });

      res.render('menProducts', { products });
  } catch (err) {
      console.error('Error fetching products under women category:', err);
      res.status(500).json({ message: 'Internal server error' });
  }
};
const sortFun=(products,sortby)=>{
  
}


// Define a route to handle sorting requests
const sortProducts= async (req, res) => {
  const sortBy = req.params.criteria; // Extract the sorting criteria from the route parameter
  try {
      // Fetch products from the database
      let products = await Product.find({ isDeleted: false }).lean(); // Assuming you're using Mongoose and want plain JavaScript objects

      // Sort the products based on the criteria
      switch (sortBy) {
          case 'popularity':
              // Sort products by popularity
              // Implement your sorting logic here
              break;
          case 'priceLowToHigh':
              // Sort products by price low to high
              products.sort((a, b) => a.price - b.price);
              break;
          case 'priceHighToLow':
              // Sort products by price high to low
              products.sort((a, b) => b.price - a.price);
              break;
          case 'averageRatings':
              // Sort products by average ratings
              // Implement your sorting logic here
              break;
              case 'featured':
    // Sort products by isFeatured field, showing featured products first
    products.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) {
            return -1; // a is featured, b is not, so a comes first
        } else if (!a.isFeatured && b.isFeatured) {
            return 1; // b is featured, a is not, so b comes first
        } else {
            return 0; // both are featured or not featured, maintain the existing order
        }
    });
    break;
          
         
              case 'aToZ':
                // Sort products by name A to Z
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'zToA':
                // Sort products by name Z to A
                products.sort((a, b) => b.name.localeCompare(a.name));
                break;
                case 'newArrivals':
    // Sort products by creation date in descending order to show the newest arrivals first
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    break;

                default:
                  // If the provided sorting criteria is invalid, default to sorting by popularity
                  // Implement your default sorting logic here
                  break;

      }

      // Render the products page with the sorted products
      res.render('products', { products });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
};


// Backend route for handling search requests
const searchProduct= async (req, res) => {
  try {
      const query = req.query.q; // Assuming the search query parameter is 'q'
      const sortBy = req.query.sortBy
      // Perform a case-insensitive search on product names and descriptions
      const products = await Product.find({
          $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } }
          ],
          active: true // Optionally, filter only active products
      });
      if (sortBy) {
        switch (sortBy) {
          case 'popularity':
              // Sort products by popularity
              // Implement your sorting logic here
              break;
          case 'priceLowToHigh':
              // Sort products by price low to high
              products.sort((a, b) => a.price - b.price);
              break;
          case 'priceHighToLow':
              // Sort products by price high to low
              products.sort((a, b) => b.price - a.price);
              break;
          case 'averageRatings':
              // Sort products by average ratings
              // Implement your sorting logic here
              break;
              case 'featured':
    // Sort products by isFeatured field, showing featured products first
    products.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) {
            return -1; // a is featured, b is not, so a comes first
        } else if (!a.isFeatured && b.isFeatured) {
            return 1; // b is featured, a is not, so b comes first
        } else {
            return 0; // both are featured or not featured, maintain the existing order
        }
    });
    break;
          
         
              case 'aToZ':
                // Sort products by name A to Z
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'zToA':
                // Sort products by name Z to A
                products.sort((a, b) => b.name.localeCompare(a.name));
                break;
                case 'newArrivals':
    // Sort products by creation date in descending order to show the newest arrivals first
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    break;

                default:
                  // If the provided sorting criteria is invalid, default to sorting by popularity
                  // Implement your default sorting logic here
                  break;

      }

    }
     
      res.render('products',{products});
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
  }
};

// Define route for handling filter requests
const filterProducts= async (req, res) => {
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






module.exports={
    
    addProduct,
    productAdd,
    getProducts,
    editProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
  getProductDetails,
  getProductsUnderWomenCategory ,
  getProductsUndermenCategory ,
  sortProducts,
  searchProduct,
  filterProducts
  
}