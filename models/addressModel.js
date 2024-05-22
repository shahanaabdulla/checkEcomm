const mongoose = require("mongoose");
const addressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId type for user_id
    ref: "User", // Reference the User model
    required: true,
  },
  type: {
    type: String,
    enum: ["home", "office"], // Allow only 'home' or 'office' as values
    required: true,
  },
 
  name: {
    type: String,
    required: true,
  },
  number: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  pincode: {
    type: Number,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
});

module.exports = new mongoose.model("Address", addressSchema);