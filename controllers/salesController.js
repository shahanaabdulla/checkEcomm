const Order = require('../models/orderModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');


const loadSales = async (req, res) => {
    try {
      res.render("./admin/sales-report.hbs",{layout: './admin/admin-layout'});
    } catch (error) {
      console.log(error.message);
    }
  };

  const calculateDateRange = (type, customRange) => {
    const now = new Date();
    let startDate, endDate;
  
    switch (type) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        // Set startDate to the beginning of the week (Sunday)
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        // Set endDate to the end of the week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        startDate = new Date(customRange.startDate);
        endDate = new Date(customRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        throw new Error('Invalid report type');
    }
  
    return { startDate, endDate };
  };
  
  
 
  
  const salesReport = async (req, res) => {
    try {
      const { type } = req.params;
      const customRange = req.body;
  
      const { startDate, endDate } = calculateDateRange(type, customRange);
  
      const salesData = await Order.getSalesReport(startDate, endDate);
  
      if (!salesData || salesData.length === 0) {
        return res.json({
          type,
          totalSales: 0,
          totalDiscount: 0,
          orderCount: 0,
          orders: []
        });
      }
  
      const report = salesData[0];
  
      res.json({
        type,
        totalSales: report.totalSales || 0,
        totalDiscount: report.totalDiscount || 0,
        orderCount: report.orderCount || 0,
        orders: report.orders || []
      });
    } catch (error) {
      console.error('Error fetching sales report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const customSales= async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
  
      const orders = await Order.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }).populate('items.product');
  
      let totalSales = 0;
      orders.forEach(order => {
        totalSales += order.totalPrice;
      });
  
      res.json({ orders, totalSales, type: 'custom' });
    } catch (error) {
      console.error('Error fetching custom sales report:', error);
      res.status(500).send('Internal Server Error');
    }
  };


  
  



  module.exports={
    loadSales,
    salesReport,
    customSales,
    
  }