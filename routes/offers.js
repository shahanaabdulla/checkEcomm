
const express = require('express');
const router = express.Router();
const adminAuth = require('../midddlewares/adminAuth')

const { offerLoad, offerCreate, offerEdit, offerDelete, offerProductsGet, productOffer, removeProductOffer, applyCategoryOffer, removeCategoryOffer } = require("../controllers/offerController");


router.get('/:offerId',offerProductsGet)
router.post('/remove-offer/:productId', removeProductOffer)
router.post('/apply-offer-category/:categoryId', applyCategoryOffer);
router.post('/category/remove-offer/:categoryId', removeCategoryOffer);
router.post('/apply-offer/:productId',productOffer)
router.use(adminAuth);
router.get('/',offerLoad)
router.post('/create',offerCreate)
router.put('/update/:id',offerEdit)
router.delete('/delete/:id',offerDelete)


module.exports = router;