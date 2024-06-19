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
  deliveryCharge: {
    type: Number,
    required: true,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Credit Card', 'Razorpay', 'Other'], // Enum for available payment methods
    required: true
  },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped','Out for Delivery' ,'Delivered', 'Cancelled','Return request placed','Returned','Approved','Rejected'],
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


orderSchema.statics.getSalesReport = function (startDate, endDate, type) {
  let groupBy = null;

  switch (type) {
    case 'daily':
      groupBy = {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
      };
      break;
    case 'weekly':
      groupBy = {
        $dateToString: { format: '%G-%V', date: '$createdAt' }
      };
      break;
    case 'monthly':
      groupBy = {
        $dateToString: { format: '%Y-%m', date: '$createdAt' }
      };
      break;
    case 'yearly':
      groupBy = {
        $dateToString: { format: '%Y', date: '$createdAt' }
      };
      break;
    default:
      throw new Error('Invalid report type');
  }

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
            if: { $gt: ['$discountAmount', 0] },
            then: '$discountAmount',
            else: 0
          }
        }
      }
    },
    {
      $group: {
        _id: groupBy,
        totalSales: { $sum: '$totalPrice' },
        totalDiscount: { $sum: '$discountAmount' },
        orderCount: { $sum: 1 },
        orders: { $push: '$$ROOT' }
      }
    }
  ]);
};

orderSchema.statics.getSalesSummary = function(startDate, endDate) {
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
};


const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
