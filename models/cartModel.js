const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        default: 0, 
      },
    },
  ],
});

module.exports = new mongoose.model("Cart", cartSchema);