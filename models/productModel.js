const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    groupingID: {
        type: Number,
        default:1
    },
    description: {
        type: String,
        required: true
    },
   
    
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Reference to the Category collection
    },
    size: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required:true
    },
    price : {
        type: Number,
        default: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      max: 255
  },
  rating: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
    ProductDiscountedPrice: {
        type: Number,
      },
      finalisedPrice: {
        type: Number,
      },
  image: {
      type: String,
      default: ''
  },
  croppedImage: {
    type: String,
    default: ''
},
  images: [{
      type: String
  }],
  isDeleted:{
    type:Boolean,
    default:false
  },
  active:{
      type:Boolean,
      default:true
  },
  isFeatured: {
      type: Boolean,
      default: false,
  },
  onOffer: {
      type: Boolean,
      default: false
  },
  rateOfDiscount: {
      type: Number,
      default: 0
  },
  offerPrice: {
    type: Number,
    default: 0
}, 
isWishlisted: {
    type: Boolean,
    default: false  
},

reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
}]},
{timestamps:true},
{ strict: false } ,
);


const Product = mongoose.model('Product', productSchema);

module.exports=Product;


