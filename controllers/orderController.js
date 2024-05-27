

const User=require('../models/userModel')
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
// Assuming you have already imported necessary modules and models
const Cart=require('../models/cartModel')
const Coupon= require('../models/couponModel')
// POST route for placing an order
const { v4: uuidv4 } = require('uuid');
const Razorpay=require('razorpay')
const razorpay= new Razorpay({
  key_id: process.env.RAZORPAY_CLIENT_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY
});







// POST route for placing an order
const placeOrderWithCOD = async (req, res) => {
  try {
    const userId = req.session.user_id; // Assuming user ID is stored in session
    const { shippingAddress, paymentMethod, couponCode, finalTotal } = req.body;
    console.log(couponCode);
    console.log(finalTotal)

    // Retrieve the cart data from the database for the logged-in user
    const cart = await Cart.findOne({ user_id: userId }).populate('products.product');

    if (!cart) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const user = await User.findById(userId);

    // Create a new order
    const orderItems = cart.products.map(item => ({
      product: item.product._id,
      quantity: item.quantity
    }));

    let totalPrice = cart.products.reduce((total, item) => total + (item.quantity * item.product.price), 0);

    let discountAmount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode });
      if (coupon) {
        const currentDate = new Date();
        if (coupon.usedCount >= coupon.usageLimit || coupon.expirationDate < currentDate) {
          return res.status(400).json({ success: false, message: 'Coupon usage limit is over or coupon is expired' });
        } else {
          if (coupon.discountType === 'percentage') {
            discountAmount = (coupon.discountValue / 100) * totalPrice;
          } else if (coupon.discountType === 'fixed') {
            discountAmount = coupon.discountValue;
          }
          totalPrice = Math.max(totalPrice - discountAmount, 0);
        }
      }
    }

    let paymentUrl;
    if (paymentMethod === 'COD') {
      // For Cash on Delivery (COD)
      const order = new Order({
        orderID: generateOrderID(), 
        userID: userId,
        items: orderItems,
        totalPrice: finalTotal,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        status: 'Pending',
        coupon: coupon ? coupon._id : null,
        discountAmount: discountAmount
      });

      const savedOrder = await order.save();

      await Cart.findOneAndUpdate({ user_id: userId }, { $set: { products: [] } });

      if (coupon) {
        coupon.usedCount += 1;
        await coupon.save();
      }

      return res.render('orderConfirmation', { orderID: savedOrder.orderID });
    } else if (paymentMethod === 'Razorpay') {
      const options = {
        amount: finalTotal * 100, // Amount in paise
        currency: 'INR',
        receipt: uuidv4() // Generate a unique order ID
      };
      const razorpayOrder = await razorpay.orders.create(options);
      const order = new Order({
        orderID: razorpayOrder.id, 
        userID: userId,
        items: orderItems,
        totalPrice: finalTotal,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        status: 'Confirmed',
        coupon: coupon ? coupon._id : null,
        discountAmount: discountAmount
      });

      const savedOrder = await order.save();

      // Update the cart
      await Cart.findOneAndUpdate({ user_id: userId }, { $set: { products: [] } });

      if (coupon) {
        coupon.usedCount += 1;
        await coupon.save();
      }

      return res.render('razorpayPaymentPage', { razorpayOrder, user, shippingAddress, finalTotal });
    } else {
      // Handle other payment methods here
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }
  } catch (error) {
    // Handle errors
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};


const getSuccessPage= async (req, res) => {
  try {
    // Retrieve the order ID from the query parameters
    const orderId = req.query.razorpay_order_id;
    const paymentId = req.body.razorpay_payment_id; 
    console.log('paymentid',paymentId)
    // Update the order status in your database
    await Order.findOneAndUpdate({ orderID: orderId }, { status: 'Paid', paymentID: paymentId });
    
    // Render the success page
    res.render('paySuccess');
  } catch (error) {
    console.error('Error handling successful payment:', error);
    // Optionally, redirect to an error page or display an error message
    res.status(500).json({ success: false, message: 'Failed to handle successful payment' });
  }
};


function generateOrderID() {
  return uuidv4(); // Generate a UUID
}


// orderController.js



// Controller function to fetch orders and render the order page
const getOrders = async (req, res) => {
  try {
      // Assuming user ID is available in the request session
      const userId = req.session.user_id;

      // Fetch orders from the database for the specific user ID
      const orders = await Order.find({ userID: userId })
                                .populate('items.product')
                                .populate('coupon')
                                .sort({ createdAt: -1 });
       console.log(orders)
      // Render the order page with the fetched orders
      res.render('orders', { orders });
  } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).send('Internal Server Error');
  }
};

const getOrderProductDetails= (req, res) => {
  // Extract query parameters from the request
  const productName = req.query.productName;
  const productPrice = req.query.productPrice;
  const orderId = req.query.orderID;
  // const productImage = req.query.productImage;

  // Render the product details page, passing extracted parameters to the template
  res.render('OrderDetails', { productName, productPrice, orderId });
};

const orderCancel= async (req, res) => {
  try {
      const orderId = req.params.orderId;
       console.log(orderId)
      // Find the order by ID and update its status to "Cancelled"
      const order = await Order.findByIdAndUpdate(orderId, { status: 'Cancelled' }, { new: true });

      if (!order) {
          return res.status(404).send('Order not found');
      }

      res.render('orderCancel')
  } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Error cancelling order' });
  }
};

const orderLoad = async(req,res)=>{
  try{
    const ordersData = await Order.find().populate({
      path: 'items.product', // Path to populate
      model: 'Product' // Model to use for population
    })  .sort({ createdAt: -1 });
     res.render('./admin/orderList',{ orders: ordersData, layout: './admin/admin-layout' })
  }catch(error){
     console.log(error.message)
  }
}

const getCancel= (req, res) => {
  res.render('orderCancel'); // Assuming 'orderCancel' is the name of your Handlebars template
};

const updateStatus= async (req, res) => {
  const { orderId, newStatus } = req.body;
  console.log(orderId)
  console.log(newStatus)
  try {
    // Find the order by orderId in the database
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Update the status of the order
    order.status = newStatus;

    // Save the updated order to the database
    await order.save();

    // Send success response
    res.json({ success: true, message: 'Order status updated successfully.' });
  } catch (error) {
    // Handle errors
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getOrderStatus = async (req, res) => {
  try {
      // Retrieve the order from the database based on the orderId
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId) .populate('items.product');

      if (!order) {
          // Handle case where order is not found
          return res.status(404).send('Order not found');
      }

      // Render the order-status.hbs view with the order status
      res.render('order-status', { order });
  } catch (error) {
      // Handle any errors that occur during the database query or rendering
      console.error('Error fetching order status:', error);
      res.status(500).send('Internal Server Error');
  }
};

const returnFormGet= (req, res) => {
  const orderId = req.query.orderId;
  res.render('return-form', { orderId }); // Assuming you are using a template engine like EJS
};

const submitReturn = async (req, res) => {
  const { orderId, returnReason } = req.body;

  try {
    // Fetch the order
    const order = await Order.findOne({ orderID: orderId }).populate('items.product');;
    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Update order status to "Returned" and add return reason
    order.status = 'Return request placed';
    order.returnReason = returnReason;
    
    // Ensure discountAmount is set before saving
    if (typeof order.discountAmount === 'undefined') {
      order.discountAmount = 0; // or any default value you prefer
    }
    
    await order.save();

    // Update user's wallet transactions
    const user = await User.findById(order.userID);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Add the refund transaction to the user's wallet
    const refundTransaction = {
      amount: order.totalPrice,
      type: 'credit',
      description: `Refund for order ${orderId}`
    };
    const walletBalance = user.wallet.reduce((total, transaction) => total + transaction.amount, 0);
user.walletBalance = walletBalance;
    user.wallet.push(refundTransaction);
    await user.save();

    // Redirect to order status page or any other desired page
    res.render('order-status', { order, message: 'Return request placed' });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).send('Internal Server Error');
  }
};






module.exports = {

  placeOrderWithCOD,
  getOrders,
  getOrderProductDetails,
  orderCancel,
  getCancel,
  orderLoad,
  updateStatus,
  getOrderStatus,
 getSuccessPage,
 returnFormGet,
 submitReturn
};
