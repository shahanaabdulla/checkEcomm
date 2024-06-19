// helpers/handlebarsHelpers.js

const { handlebars } = require('hbs');

handlebars.registerHelper('calculatePrice', (price, quantity) => price * quantity);
handlebars.registerHelper('calculateTotalPrice', (cartProducts) => {
    let totalPrice = 0;

    // Loop through each product in the cart and sum up their prices
    cartProducts.forEach((cartProduct) => {
        let finalPrice = cartProduct.product.price; // Default to the original price

        // Check if the product has an offerPrice
        if (cartProduct.product.onOffer && cartProduct.product.offerPrice) {
            finalPrice = cartProduct.product.offerPrice;
        }

        // Check if the product has a categoryOfferPrice
        if (cartProduct.product.categoryOfferPrice) {
            // Use the lower price between offerPrice and categoryOfferPrice
            if (!cartProduct.product.onOffer || (cartProduct.product.offerPrice && cartProduct.product.categoryOfferPrice < cartProduct.product.offerPrice)) {
                finalPrice = cartProduct.product.categoryOfferPrice;
            }
        }

        totalPrice += finalPrice * cartProduct.quantity;
    });

    // Return the total price
    return totalPrice.toFixed(2); // Assuming you want to display the total price with two decimal places
});

handlebars.registerHelper('isCurrentPage', (currentPage, pageNumber) => {
    return currentPage === pageNumber;
});

handlebars.registerHelper('formatDate', function (date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleDateString('en-US', options);
});

handlebars.registerHelper('eq', function (val1, val2) {
    return val1 === val2;
});

handlebars.registerHelper('or', function (val1, val2) {
    return val1 || val2;
});

handlebars.registerHelper('calculateOfferPrice', (price, discount) => {
    return (price - (price * (discount / 100))).toFixed(2);
});

handlebars.registerHelper('hasOfferProducts', function (products, options) {
    let hasOffer = products.some(product => product.product.onOffer);
    return hasOffer ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
});

handlebars.registerHelper('isSelected', function (option, value) {
    return option === value ? 'selected' : '';
});

handlebars.registerHelper('calculateShippingCost', function (totalPrice) {
    return totalPrice < 1000 ? '80.00' : '0.00';
});

handlebars.registerHelper('calculateGrandTotal', function (totalPrice, shippingCost) {
    return (parseFloat(totalPrice) + parseFloat(shippingCost)).toFixed(2);
});

handlebars.registerHelper('lt', function (a, b, options) {
    if (a < b) {
        return options.fn(this); // Execute the block if 'a' is less than 'b'
    } else {
        return options.inverse(this); // Otherwise, execute the inverse block
    }
});
