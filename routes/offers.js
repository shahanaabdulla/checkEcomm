
const express = require('express');
const router = express.Router();

const { offerLoad, offerCreate, offerEdit, offerDelete, offerProductsGet } = require("../controllers/offerController");

router.get('/',offerLoad)
router.post('/create',offerCreate)
router.put('/update/:id',offerEdit)
router.delete('/delete/:id',offerDelete)

router.get('/:offerId',offerProductsGet)


module.exports = router;