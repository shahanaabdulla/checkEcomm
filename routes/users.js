const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose')
const multer = require('multer');
const passport=require('passport')
const userController = require('../controllers/userController')
const checkEmailExistence=require('../midddlewares/checkEmail')
const { isAuth, isAccess,isAuthenticated } = require("../midddlewares/auth");


router.use(passport.initialize())
router.use(passport.session())
require('../passport')
const {
  getAllProducts,
  getProductDetails,
  getProductsUnderWomenCategory,
  getProductsUndermenCategory, 
  sortProducts,
  searchProduct,
  filterProducts
}=require('../controllers/productController')

const {
  addToCart,
  removeFromCart,
  cartLoad,
  getCartCount,
  checkOutLoad,
  updateAddressCheckout,
  editAddressCheckout,
  deleteAddressCheckout,
  updateCart,
  checkoutaddAddressLoad,
  checkoutaddAddressPost
}=require('../controllers/cartController')
const {
   placeOrderWithCOD ,
   getOrders,
   getOrderProductDetails,
   orderCancel,
   getCancel,
  getSuccessPage,
  returnFormGet,
  submitReturn
} = require('../controllers/orderController');

const {
  loadWishlist,
  addToWishlist,
  moveToCart,
  removeWishlist
}=require('../controllers/wishlistController')



const{
successGoogleLogin,
failureGoogleLogin
}=require('../controllers/authController')
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

//auth cllback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/success",
    failureRedirect: "/failure",
  })
);

router.get("/success", successGoogleLogin);
router.get("/failure", failureGoogleLogin);


router.get('/',userController.homeLoad)
router.get('/login',userController.loginLoad)
router.post('/login',userController.verifyLogin)
router.get('/signup',userController.signUpLoad)
router.post('/signup',checkEmailExistence,userController.signup_post)
router.post('/forgot-password',userController.forgotPassword)
router.get('/forgot-password',userController.forgotPasswordLoad)
router.get('/reset-password',userController.resetPasswordForm)
router.post('/reset-password',userController.resetPassword)

router.post('/verifyOTP',userController.verifyOTP_post)
router.post('/resendOTP', userController.resendOTP)
router.post('/block-user/:id',userController.blockUser)
router.post('/unblock-user/:id',userController.unBlockUser)
router.get('/edit-user/:id',userController.editUserLoad)
router.post('/edit-user/:id',userController.updateUser);

router.post('/addresses/:addressId/delete',userController.deleteAddress)
//router.get('/generateOTP',userController.generateOTP)
router.get('/addresses/:addressId/edit',userController.editAddress)
router.post('/addresses/:addressId/update',userController.updateAddress )


// router.get('/verify',userController.verifyMail)
router.get('/add-address',isAuth,userController.addAddressLoad)
router.post('/add-address',userController.addAddressPost)
router.get('/checkout/add',checkoutaddAddressLoad)
router.post('/checkout/add',checkoutaddAddressPost)
router.get('/cart',cartLoad)
router.post('/add-to-cart', addToCart)
router.put('/cart/:productId', updateCart);
router.get('/api/cart/count',getCartCount)
router.delete('/cart/:productId', removeFromCart);
router.get('/checkout',checkOutLoad)
router.get('/addresses/:addressId/editcheckout',editAddressCheckout)
router.post('/addresses/:addressId/updatecheckout',updateAddressCheckout)
router.post('/addresses/:addressId/deletecheckout',deleteAddressCheckout)


// router.get('/user-details',isAuth,userController.userDetailsLoad)

router.get('/usersdetails', userController.getUserDetails)
router.get('/logout',userController.userLogout)

router.get('/products',getAllProducts);
router.get('/products/:id',getProductDetails)
router.get('/women', getProductsUnderWomenCategory)
router.get('/men', getProductsUndermenCategory)
router.get('/products/sort/:criteria',sortProducts)
router.get('/search/:criteria', sortProducts);
router.get('/api/products',filterProducts)

router.get('/search',searchProduct)

router.post('/place-order', placeOrderWithCOD);
router.get('/orders',isAuth,getOrders)
router.get('/orders/:orderId/product/:productId', getOrderProductDetails);
router.get('/product-details',getOrderProductDetails)
router.post('/cancel-order/:orderId',orderCancel)
router.get('/orderCancel',getCancel)

router.get('/wishlist',loadWishlist)
router.post('/add-wishlist/:productId',addToWishlist)
router.post('/move-to-cart/:productId', moveToCart);
router.post('/remove-wishlist/:productId',removeWishlist)

router.get('/razorpay/success',getSuccessPage)
router.get('/return-form',returnFormGet)
router.post('/submit-return',submitReturn)
module.exports = router;
