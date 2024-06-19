// order.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../midddlewares/adminAuth')

const {
     orderLoad,
     updateStatus ,
     getOrderStatus,
     getSalesSummary,
     
} = require('../controllers/orderController');

const { couponLoad,
     couponCreate,
     couponEdit,
     couponDelete,
     couponGet
 } = require('../controllers/couponController');
 const {loadSales,
     salesReport,
     customSales,
     salesOrder,
     barChart,
     pieChart,
     
    
 }=require('../controllers/salesController');
const { bestSellingProduct, bestSellingCategory, bestSellingBrands } = require('../controllers/adminController');


 router.get('/order-status/:orderId',getOrderStatus)
 router.get('/coupons',couponGet)

 router.use(adminAuth);  
router.get('/orderlist', orderLoad);
router.post('/update-order-status',updateStatus)


router.get('/coupon',couponLoad)
router.post('/couponCreate',couponCreate)
router.put('/couponUpdate/:id',couponEdit)
router.delete('/couponDelete/:id',couponDelete)


router.get('/sales',loadSales)
router.get('/sales-report/:type',salesReport)
router.post('/sales-report/custom',customSales)
router.get('/api/sales-orders',salesOrder)

router.get('/bestProduct',bestSellingProduct)
router.get('/bestCategory',bestSellingCategory)
router.get('/bestBrand',bestSellingBrands)


router.get("/categorySale", pieChart);


router.get("/barChart", barChart);

router.get('/sales-summary', getSalesSummary)

module.exports = router;
