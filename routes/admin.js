var express = require("express");
var router = express.Router();
const mongoose = require('mongoose')
const session = require('express-session');
const multer = require('multer')
//const productMulter=require('../multer/product')
const { uploads, resizeImage } = require('../multer/product')



// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './public/productImages')
//   },
//   filename: function (req, file, cb) {
//     const fileName = file.originalname.split(' ').join('-');
//     cb(null, fileName + '-' + Date.now);
//   }
// })

// const upload = multer({ storage:storage})
const {
  loadLogin,
  adminDashboard,
  getCustomers,
  addUser,
  editUserLoad,
  updateUser,
  deleteUser,
  adminLogout,
  loadAddUser,
  loadDashboard,
 
} = require('../controllers/adminController')
const {

  addProduct,
  getProducts,
  productAdd,
  editProduct,
  updateProduct,
  deleteProduct,

} = require('../controllers/productController')


const {
  createCat,
  getCategory,
  addCategory,
  categoryAdd,
  addingCat,
  editCategory,
  updateCategory,
  deleteCategory

} = require('../controllers/categoryController')


router.use(session(
  {
    secret: 'sessionSecret',
    resave: false,
    saveUninitialized: false
  }))

router.get('/login', loadLogin);
router.get('/dashboard', loadDashboard);
router.post('/login', adminDashboard);
router.get('/add-user', loadAddUser)
router.post('/add-user', addUser)
router.get('/usersList', getCustomers);

router.post('/usersList', addUser);
router.get('/edit-user/:id', editUserLoad);
router.post('/edit-user/:id', updateUser);
router.get('/delete-user/:id', deleteUser);
router.get('/logout', adminLogout)

router.get('/product', productAdd)
router.post('/product', resizeImage, uploads.fields([{ name: 'image' }, { name: 'images', maxCount: 3 }]), addProduct);


// router.post('/product',upload.single('image'),product_create_post)
router.get('/productList', getProducts)
router.get('/edit-product/:id', editProduct);
router.post('/edit-product/:id', uploads.fields([{ name: 'image' }, { name: 'images', maxCount: 3 }]), updateProduct);


router.get('/delete-product/:id', deleteProduct);



router.get('/category', createCat)
router.get('/categoryList', getCategory)
router.post('/category', addCategory)
router.get('/category-add', addingCat)
router.post('/category-add', categoryAdd)

router.get('/edit-category/:id', editCategory)
router.post('/edit-category/:id', updateCategory)
router.get('/:id', deleteCategory)












module.exports = router
