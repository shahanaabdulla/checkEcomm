const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderID: {
    type: String,
    required: true,
    unique: true
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId, // Assuming each order is associated with a user
    ref: 'User' // Reference to the User model
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product' // Reference to the Product model
    },
    quantity: {
      type: Number,
      required: true
    }
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  shippingAddress: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Credit Card', 'Razorpay', 'Other'], // Enum for available payment methods
    required: true
  },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped','Out for Delivery' ,'Delivered', 'Cancelled','Return request placed','Returned'],
    default: 'Pending'
  },
  discountAmount:{
    type: Number,
    required:true
  },
  
  returnReason: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


orderSchema.statics.getSalesReport = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lt: new Date(endDate)
        },
        status: { $ne: 'Cancelled' } // Exclude cancelled orders
      }
    },
    {
      $addFields: {
        discountAmount: {
          $cond: {
            if: { $gt: ['$discountAmount', 0] }, // Check if discountAmount is greater than 0
            then: '$discountAmount', // If yes, use the provided discount amount
            else: 0 // If not, set discount amount to 0
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalPrice' },
        totalDiscount: { $sum: '$discountAmount' },
        orderCount: { $sum: 1 },
        orders: { $push: '$$ROOT' }
      }
    }
  ]);
};





const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
