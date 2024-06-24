

const User = require('../models/userModel')
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
// Assuming you have already imported necessary modules and models
const Cart = require('../models/cartModel')
const Coupon = require('../models/couponModel')
const easyinvoice = require('easyinvoice')
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay')
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_CLIENT_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY
});

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path')


const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findOne({ orderID: orderId }).populate('items.product');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers to download the file as a PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Company details (top-right)
    doc.fontSize(10).text('Yoobuy', 450, 50, { align: 'right' });
    doc.text('1234 Street Name', { align: 'right' });
    doc.text('City, State, ZIP', { align: 'right' });
    doc.text('Phone: 123-456-7890', { align: 'right' });
    doc.moveDown();

    // Invoice title and Order ID
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order.orderID}`, { align: 'left' });

    // Customer address
    doc.fontSize(10).text('Shipping Address:', { align: 'left' });
    doc.text(`${order.shippingAddress}`, { align: 'left' });
    doc.moveDown();

    // Invoice date
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Items table headers
    const tableTop = 250;
    const nameX = 50;
    const quantityX = 280;
    const priceX = 350;
    const totalX = 450;

    doc.fontSize(10).text('Name', nameX, tableTop);
    doc.text('Quantity', quantityX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let itemY = tableTop + 30;
    let subtotal = 0;
    let totalTax = 0; // Initialize total tax
    order.items.forEach(item => {
      // Calculate item price with tax
      let price = item.product.price;

      if (item.product.onOffer) {
        if (item.product.offerPrice && item.product.categoryOfferPrice) {
          price = Math.min(item.product.offerPrice, item.product.categoryOfferPrice);
        } else if (item.product.offerPrice) {
          price = item.product.offerPrice;
        } else if (item.product.categoryOfferPrice) {
          price = item.product.categoryOfferPrice;
        }
      }

      const totalItemPrice = price * item.quantity;
      subtotal += totalItemPrice;

      // Calculate tax for this item
      const itemTax = totalItemPrice * 0.1;
      totalTax += itemTax;

      // Render item details in the invoice
      doc.text(item.product.name, nameX, itemY);
      doc.text(item.quantity, quantityX, itemY);
      doc.text(`₹${price.toFixed(2)}`, priceX, itemY);
      doc.text(`₹${totalItemPrice.toFixed(2)}`, totalX, itemY);
      itemY += 20;
    });

    // Draw line below items
    doc.moveTo(50, itemY).lineTo(550, itemY).stroke();

    // Summary
    const summaryTop = itemY + 20;
    const rightAlign = 450;

    // Add delivery charge if subtotal is less than 1000
    let deliveryCharge = 0;
    if (subtotal < 1000) {
      deliveryCharge = 80;
      subtotal += deliveryCharge;
    }

    // Calculate total amount
    const total = subtotal + totalTax;

    doc.fontSize(10);
    doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, rightAlign, summaryTop);
    doc.text(`Tax (10%): ₹${totalTax.toFixed(2)}`, rightAlign, summaryTop + 15);
    doc.text(`Delivery Charge: ₹${deliveryCharge.toFixed(2)}`, rightAlign, summaryTop + 30);
    if (order.discountAmount > 0) {
      doc.text(`Discount: -₹${order.discountAmount.toFixed(2)}`, rightAlign, summaryTop + 45);
    }
    doc.font('Helvetica-Bold').text(`Total: ₹${total.toFixed(2)}`, rightAlign, summaryTop + 60);

    // End the PDF document
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Internal Server Error');
  }
};


// POST route for placing an order
const placeOrderWithCOD = async (req, res) => {
  try {
    const userId = req.session.user_id; // Assuming user ID is stored in session
    const { shippingAddress, paymentMethod, couponCode, finalTotal } = req.body;
    console.log(couponCode);
    console.log(finalTotal);

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

    let subtotal = 0;
    cart.products.forEach(item => {
      let price = item.product.price;

      if (item.product.onOffer) {
        if (item.product.offerPrice && item.product.categoryOfferPrice) {
          price = Math.min(item.product.offerPrice, item.product.categoryOfferPrice);
        } else if (item.product.offerPrice) {
          price = item.product.offerPrice;
        } else if (item.product.categoryOfferPrice) {
          price = item.product.categoryOfferPrice;
        }
      }

      const totalItemPrice = price * item.quantity;
      subtotal += totalItemPrice;
    });

    // Calculate delivery charge
    let deliveryCharge = 0;
    if (subtotal < 1000) {
      deliveryCharge = 80;
    }

    // Calculate tax
    const tax = subtotal * 0.1;

    // Calculate total price
    let totalPrice = subtotal + tax + deliveryCharge;

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

    if (paymentMethod === 'COD') {
      // For Cash on Delivery (COD)
      const order = new Order({
        orderID: generateOrderID(), // Ensure this function is defined
        userID: userId,
        items: orderItems,
        totalPrice: totalPrice,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        status: 'Pending',
        coupon: coupon ? coupon._id : null,
        discountAmount: discountAmount,
        deliveryCharge: deliveryCharge
      });

      const savedOrder = await order.save();

      await Cart.findOneAndUpdate({ user_id: userId }, { $set: { products: [] } });

      if (coupon) {
        coupon.usedCount += 1;
        await coupon.save();
      }

      return res.render('orderConfirmation', { orderID: savedOrder.orderID });
    } else if (paymentMethod === 'Razorpay') {
      const amountInPaise = Math.round(totalPrice * 100); // Convert total price to paise

      const options = {
        amount: amountInPaise, // Amount in paise
        currency: 'INR',
        receipt: uuidv4() // Generate a unique order ID
      };

      const razorpayOrder = await razorpay.orders.create(options);

      const order = new Order({
        orderID: razorpayOrder.id,
        userID: userId,
        items: orderItems,
        totalPrice: totalPrice,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        status: 'Confirmed',
        coupon: coupon ? coupon._id : null,
        discountAmount: discountAmount,
        deliveryCharge: deliveryCharge
      });

      const savedOrder = await order.save();

      // Update the cart
      await Cart.findOneAndUpdate({ user_id: userId }, { $set: { products: [] } });

      if (coupon) {
        coupon.usedCount += 1;
        await coupon.save();
      }

      return res.render('razorpayPaymentPage', { razorpayOrder, user, shippingAddress, finalTotal: totalPrice });
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



const paymentFailure = async (req, res) => {
  try {
    // Extract error details from the query parameters
    const { razorpay_payment_id, razorpay_order_id, error_code, error_description } = req.query;

    // Find the order using the Razorpay order ID
    const order = await Order.findOne({ orderID: razorpay_order_id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Render the failure page with the error details and order ID
    res.render('payFail', {
      razorpay_payment_id,
      razorpay_order_id,
      error_code,
      error_description,
      order_id: order._id
    });
  } catch (error) {
    console.error('Error handling payment failure:', error);
    res.status(500).json({ success: false, message: 'Failed to handle payment failure' });
  }
};



const getSuccessPage = async (req, res) => {
  try {
    // Retrieve the order ID from the query parameters
    const orderId = req.query.razorpay_order_id;
    const paymentId = req.body.razorpay_payment_id;
    console.log('paymentid', paymentId)
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

const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id } = req.query;

    // Update the order status in your database
    const order = await Order.findOneAndUpdate(
      { orderID: razorpay_order_id },
      { status: 'Payment Pending' },
      { new: true } // This option returns the updated document
    ).populate('items.product'); // Populating the product details in the items array if necessary

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Render the page with the updated order details
    res.render('order-status', { order, msg: 'Your payment has failed.', razorpay_order_id });
  } catch (error) {
    console.error('Error handling payment failure:', error);
    res.status(500).json({ success: false, message: 'Failed to handle payment failure' });
  }
};

const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the order based on orderId
    const order = await Order.findOne({ orderID: orderId }).populate('items.product');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Calculate the subtotal
    let subtotal = 0;
    order.items.forEach(item => {
      let price = item.product.price;

      if (item.product.onOffer) {
        if (item.product.offerPrice && item.product.categoryOfferPrice) {
          price = Math.min(item.product.offerPrice, item.product.categoryOfferPrice);
        } else if (item.product.offerPrice) {
          price = item.product.offerPrice;
        } else if (item.product.categoryOfferPrice) {
          price = item.product.categoryOfferPrice;
        }
      }

      subtotal += price * item.quantity;
    });

    // Calculate tax (10% of subtotal)
    const tax = subtotal * 0.10;

    // Calculate delivery charge if subtotal is less than 1000
    const deliveryCharge = subtotal < 1000 ? 80 : 0;

    // Calculate the final total price
    let totalPrice = subtotal + tax + deliveryCharge;

    // Apply any order-specific discount if available
    if (order.discountAmount) {
      totalPrice -= order.discountAmount;
    }

    // Update order status to 'Confirmed'
    order.status = 'Confirmed';
    await order.save();

    // Render the Razorpay payment page again with the updated order details
    return res.render('razorpayPaymentPage', {
      razorpayOrder: {
        id: order.orderID,
        amount: (totalPrice * 100).toFixed(2), // Razorpay amount is in paise, formatted to 2 decimal places
        currency: 'INR',
        key: process.env.RAZORPAY_CLIENT_ID // Replace with your actual Razorpay key
      },
      user: await User.findById(order.userID),
      shippingAddress: order.shippingAddress,
      finalTotal: totalPrice.toFixed(2) // Formatted to 2 decimal places
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({ success: false, message: 'Failed to retry payment' });
  }
};


function generateOrderID() {
  return uuidv4(); // Generate a UUID
}


function generatePaginationButtons(currentPage, totalPages) {
  const buttons = [];
  for (let i = 1; i <= totalPages; i++) {
    buttons.push(i);
  }
  return buttons;
}




// Controller function to fetch orders and render the order page
const getOrders = async (req, res) => {
  try {
    // Retrieve user ID from session
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(404).send('User ID not found in session');
    }

    const currentPage = parseInt(req.query.page) || 1; // Default to page 1
    const itemsPerPage = 5; // Adjust as needed

    // Calculate skip and limit values based on page number and items per page
    const skip = (currentPage - 1) * itemsPerPage;
    const limit = itemsPerPage;

    // Get total order count for the user
    const totalOrdersCount = await Order.countDocuments({ userID: userId });

    // Find orders with pagination and populate items and coupon details
    const orders = await Order.find({ userID: userId })
      .populate('items.product')
      .populate('coupon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalOrdersCount / itemsPerPage);
    const paginationButtons = generatePaginationButtons(currentPage, totalPages);

    res.render('orders', {
      orders,
      currentPage,
      totalPages,
      paginationButtons,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Internal Server Error');
  }
};


const getOrderProductDetails = (req, res) => {
  // Extract query parameters from the request
  const productName = req.query.productName;
  const productPrice = req.query.productPrice;
  const orderId = req.query.orderID;
  // const productImage = req.query.productImage;

  // Render the product details page, passing extracted parameters to the template
  res.render('OrderDetails', { productName, productPrice, orderId });
};

const orderCancel = async (req, res) => {
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

const orderLoad = async (req, res) => {
  try {
    const ordersData = await Order.find().populate({
      path: 'items.product', // Path to populate
      model: 'Product' // Model to use for population
    }).sort({ createdAt: -1 });
    res.render('./admin/orderList', { orders: ordersData, layout: './admin/admin-layout' })
  } catch (error) {
    console.log(error.message)
  }
}

const getCancel = (req, res) => {
  res.render('orderCancel'); // Assuming 'orderCancel' is the name of your Handlebars template
};

const updateStatus = async (req, res) => {
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
    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      // Handle case where order is not found
      return res.status(404).send('Order not found');
    }

    // Calculate subtotal
    let subtotal = 0;
    order.items.forEach(item => {
      let price = item.product.price;

      if (item.product.onOffer) {
        if (item.product.offerPrice && item.product.categoryOfferPrice) {
          price = Math.min(item.product.offerPrice, item.product.categoryOfferPrice);
        } else if (item.product.offerPrice) {
          price = item.product.offerPrice;
        } else if (item.product.categoryOfferPrice) {
          price = item.product.categoryOfferPrice;
        }
      }

      const totalItemPrice = price * item.quantity;
      subtotal += totalItemPrice;
    });

    // Calculate delivery charge
    let deliveryCharge = 0;
    if (subtotal < 1000) {
      deliveryCharge = 80;
    }

    // Calculate tax
    const tax = subtotal * 0.1;

    // Calculate total price
    const totalPrice = subtotal + tax + deliveryCharge;

    // Render the order-status.hbs view with the order status and total price
    res.render('order-status', { order, totalPrice: totalPrice.toFixed(2) });
  } catch (error) {
    // Handle any errors that occur during the database query or rendering
    console.error('Error fetching order status:', error);
    res.status(500).send('Internal Server Error');
  }
};


const returnFormGet = (req, res) => {
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

// Adjust the path as necessary
const getSalesSummary = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const result = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
          },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
          totalDeliveredOrders: {
            $sum: {
              $cond: { if: { $eq: ['$status', 'Delivered'] }, then: 1, else: 0 }
            }
          },
          totalPendingOrders: {
            $sum: {
              $cond: { if: { $eq: ['$status', 'Pending'] }, then: 1, else: 0 }
            }
          }
        }
      }
    ]);

    if (result.length === 0) {
      res.json({
        totalOrders: 0,
        totalSales: 0,
        totalDeliveredOrders: 0,
        totalPendingOrders: 0
      });
    } else {
      const {
        totalSales,
        totalOrders,
        totalDeliveredOrders,
        totalPendingOrders
      } = result[0];
      res.json({
        totalOrders,
        totalSales,
        totalDeliveredOrders,
        totalPendingOrders
      });
    }
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
  submitReturn,
  downloadInvoice,
  handlePaymentFailure,
  retryPayment,
  paymentFailure,
  getSalesSummary
};
