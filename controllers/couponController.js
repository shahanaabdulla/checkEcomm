const express = require('express');
const router = express.Router();
const Coupon = require('../models/couponModel');

// Create a new coupon
const couponCreate = async (req, res) => {
  try {
    const { code, discountType, discountValue, expirationDate, usageLimit } = req.body;

    // Check if a coupon with the same code already exists
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).send({ message: 'Coupon already exists' });
    }

    // Create and save the new coupon
    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue,
      expirationDate,
      usageLimit
    });
    await newCoupon.save();

    // Redirect to the coupon page or send a success response
    res.redirect('/order/coupon');
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};




const couponLoad= async(req,res)=>{
    try{
        const coupons = await Coupon.find();
       res.render('./admin/coupon',{coupons,layout: './admin/admin-layout' })
    }catch(error){
       console.log(error.message)
    }
}

const couponEdit= async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, expirationDate, usageLimit } = req.body;
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, {
      code,
      discountType,
      discountValue,
      expirationDate,
      usageLimit
    }, { new: true });
    res.redirect('/order/coupon');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const couponDelete= async (req, res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.redirect('/order/coupon');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Example backend endpoint in Express.js
const couponGet= async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coupons' });
  }
};



module.exports={
   couponCreate,
   couponLoad,
   couponEdit,
   couponDelete,
   couponGet
}
