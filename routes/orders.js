// order.js
const express = require('express');
const router = express.Router();

const {
     orderLoad,
     updateStatus ,
     getOrderStatus
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
     
    
 }=require('../controllers/salesController')


router.get('/orderlist', orderLoad);
router.post('/update-order-status',updateStatus)
router.get('/order-status/:orderId',getOrderStatus)

router.get('/coupon',couponLoad)
router.post('/couponCreate',couponCreate)
router.put('/couponUpdate/:id',couponEdit)
router.delete('/couponDelete/:id',couponDelete)
router.get('/coupons',couponGet)

router.get('/sales',loadSales)
router.get('/sales-report/:type',salesReport)
router.post('/sales-report/custom',customSales)


module.exports = router;
