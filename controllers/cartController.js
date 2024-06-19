// controllers/cartController.js
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Address = require('../models/addressModel')
const Offer = require('../models/offerModel')

const cartLoad = async (req, res) => {
  try {
    const userId = req.session.user_id;

    console.log(userId)
    const cart = await Cart.findOne({ user_id: userId }).populate('products.product');


    let totalOfferDiscount = 0;
    let totalPrice = 0;
    cart.products.forEach(item => {
      const itemPrice = item.product.onOffer ? item.product.offerPrice : item.product.price;
      const categoryOfferPrice = item.product.categoryOfferPrice || itemPrice;
      const finalItemPrice = Math.min(itemPrice, categoryOfferPrice);

      totalPrice += finalItemPrice * item.quantity;

      if (item.product.onOffer) {
        totalOfferDiscount += (item.product.price - item.product.offerPrice) * item.quantity;
      } else if (categoryOfferPrice < item.product.price) {
        totalOfferDiscount += (item.product.price - categoryOfferPrice) * item.quantity;
      }
    });

    totalOfferDiscount = totalOfferDiscount.toFixed(2);
    const shippingCost = totalPrice < 1000 ? 80 : 0;
    const grandTotal = (totalPrice + shippingCost).toFixed(2);
    const taxRate = 0.10; // 10% tax rate
    const taxAmount = (totalPrice * taxRate).toFixed(2);
    console.log("Total Price:", totalPrice); // Debugging
    console.log("Shipping Cost:", shippingCost); // Debugging
    console.log("Grand Total:", grandTotal); // Debugging

    res.render('cart', {
      cart,
      totalOfferDiscount,
      totalPrice: totalPrice.toFixed(2),
      shippingCost,
      grandTotal,
      taxAmount,
      userId // Pass userId to the cart view
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};



// Controller method to add a product to the cart
const addToCart = async (req, res) => {
  const { productId, quantity } = req.body; // Get product ID and quantity from request body
  const userId = req.session.user_id; // Assuming user ID is stored in session

  try {
    // Check if product exists
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product is part of an offer
    const offer = await Offer.findOne({ product: productId });
    const price = offer ? offer.discountPrice : product.price;

    // Check if cart exists for the user
    let cart = await Cart.findOne({ user_id: userId });

    // If cart doesn't exist, create a new one
    if (!cart) {
      cart = new Cart({ user_id: userId });
    }

    // Check if product already exists in the cart
    const existingItem = cart.products.find(item => item.product.equals(productId));

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
      existingItem.totalPrice += quantity * price; // Update total price
    } else {
      cart.products.push({ product: productId, quantity });
      cart.totalPrice += quantity * price; // Update total price
    }

    // Save the updated cart
    await cart.save();
    cart = await Cart.findOne({ user_id: userId }).populate('products.product');

    res.redirect('/cart');
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "An error occurred" });
  }
};



const getCartCount = async (req, res) => {
  try {
    const userId = req.session.user_id; // Assuming user ID is stored in session
    const cart = await Cart.findOne({ user_id: userId });
    console.log(cart)
    let cartItemCount = 0;
    if (cart) {
      cartItemCount = cart.products.length;
    }
    res.json({ cartItemCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Define a route to fetch cart products



// Route to handle updating the quantity of a product in the cart
const updateCart = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const userId = req.session.user_id; // Assuming you're using session-based authentication

  try {
    // Find the user's cart
    let cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the product in the cart and update its quantity
    const productIndex = cart.products.findIndex(item => item.product.equals(productId));

    if (productIndex !== -1) {
      cart.products[productIndex].quantity = quantity;
    } else {
      // Handle case where product is not found in the cart
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Save the updated cart
    await cart.save();

    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "An error occurred" });
  }
};


// Controller function
const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  const userId = req.session.user_id;

  try {
    let cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Remove the product from the cart's products array
    cart.products = cart.products.filter(item => !item.product.equals(productId));

    // Save the updated cart
    await cart.save();

    res.status(200).json({ message: "Product removed from cart successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "An error occurred" });
  }
};



const checkOutLoad = async (req, res) => {
  try {
    const userId = req.session.user_id; // Assuming user ID is stored in session

    const addresses = await Address.find({ user_id: userId });

    // Retrieve the cart data from the database for the logged-in user
    console.log(userId);
    const cart = await Cart.findOne({ user_id: userId }).populate('products.product');

    if (!cart) {
      // Handle case where cart is not found
      return res.status(404).send('Cart not found');
    }

    // Calculate total offer discount and total price
    let totalOfferDiscount = 0;
    let totalPrice = 0;
    cart.products.forEach(item => {
      const itemPrice = item.product.onOffer ? item.product.offerPrice : item.product.price;
      const categoryOfferPrice = item.product.categoryOfferPrice || itemPrice; // Use category offer price if available, otherwise use item price
      const finalItemPrice = Math.min(itemPrice, categoryOfferPrice); // Get the minimum price among itemPrice and categoryOfferPrice

      totalPrice += finalItemPrice * item.quantity;

      if (item.product.onOffer) {
        totalOfferDiscount += (item.product.price - item.product.offerPrice) * item.quantity;
      } else if (categoryOfferPrice < item.product.price) {
        totalOfferDiscount += (item.product.price - categoryOfferPrice) * item.quantity;
      }
    });

    totalOfferDiscount = totalOfferDiscount.toFixed(2);
    const shippingCost = totalPrice < 1000 ? 80 : 0;
    const taxRate = 0.10; // 10% tax rate
    const taxAmount = (totalPrice * taxRate).toFixed(2);
    const grandTotal = (totalPrice + shippingCost + parseFloat(taxAmount)).toFixed(2);

    console.log("Total Price:", totalPrice); // Debugging
    console.log("Shipping Cost:", shippingCost); // Debugging
    console.log("Grand Total:", grandTotal); // Debugging

    // Render the checkout page with the updated amounts
    res.render('checkoutPage', {
      cart,
      addresses,
      totalOfferDiscount,
      totalPrice: totalPrice.toFixed(2),
      shippingCost,
      taxAmount,
      grandTotal
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const quantityUpdate = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    console.log(productId);
    console.log(quantity);

    // Validate the incoming data
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Find the cart based on the user ID or any other identifier
    const userId = req.session.user_id; // Assuming user ID is stored in session
    const cart = await Cart.findOne({ user_id: userId });

    // If cart not found, return an error
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Find the index of the product in the cart's products array
    const productIndex = cart.products.findIndex(p => p.product.toString() === productId);

    // If product not found in cart, return an error
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found in cart' });
    }

    // Update the quantity of the product
    cart.products[productIndex].quantity = quantity;

    // Save the updated cart
    await cart.save();

    // Respond with a success message
    res.status(200).json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};




const editAddressCheckout = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).send('Address not found');
    }
    res.render('checkoutAddress', { address });
  } catch (error) {
    console.error('Error rendering edit address form:', error);
    res.status(500).send('Internal Server Error');
  }
};


const updateAddressCheckout = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    const { name, number, address, city, pincode, state, country, type } = req.body;

    // Update the address in the database
    await Address.findByIdAndUpdate(addressId, {
      name,
      number,
      address,
      city,
      pincode,
      state,
      country,
      type
    });

    // Fetch all addresses belonging to the user
    const userId = req.session.user_id; // Assuming user ID is stored in session
    // Retrieve the cart data from the database for the logged-in user
    const cart = await Cart.findOne({ user_id: userId }).populate('products.product');
    // Retrieve the addresses associated with the user
    const addresses = await Address.find({ user_id: userId });
    if (!cart) {
      // Handle case where cart is not found
      return res.status(404).send('Cart not found');
    }

    // Pass the cart and addresses data to the checkoutPage template for rendering
    res.render('checkoutPage', { cart, addresses });

  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).send('Internal Server Error');
  }
};

const deleteAddressCheckout = async (req, res) => {

  try {
    const addressId = req.params.addressId;
    // Verify if the address belongs to the authenticated user (optional)
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).send('Address not found');
    }
    if (address.user_id.toString() !== req.session.user_id) {
      return res.status(403).send('Unauthorized');
    }
    // Delete the address
    await Address.findByIdAndDelete(addressId);
    const userId = req.session.user_id; // Assuming user ID is stored in session
    // Retrieve the cart data from the database for the logged-in user
    const cart = await Cart.findOne({ user_id: userId }).populate('products.product');
    // Retrieve the addresses associated with the user
    const addresses = await Address.find({ user_id: userId });

    res.render('checkoutPage', { cart, addresses })
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).send('Internal Server Error');
  }
}

const checkoutaddAddressLoad = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    console.log()
    res.render('checkoutAddAddress.hbs', { user_id })
  } catch (error) {
    console.log(error.message)
  }
}


const checkoutaddAddressPost = async (req, res) => {
  try {
    // Retrieve user ID from session
    const userId = req.session.user_id;

    // Ensure that user ID is provided
    if (!userId) {
      return res.status(400).json({ error: 'User ID is missing from the session' });
    }

    // Extract address data from the request body
    const { name, number, address, city, pincode, state, country, type } = req.body;

    // Create a new address instance with the user ID
    const newAddress = new Address({
      user_id: userId,
      name,
      number,
      address,
      city,
      pincode,
      state,
      country,
      type
    });

    // Save the new address to the database
    await newAddress.save();
    const addresses = await Address.find({ user_id: userId });
    const cart = await Cart.findOne({ user_id: userId }).populate('products.product');
    // Render the same hbs file with the user's addresses
    res.render('checkoutPage', { addresses, cart })
    // Send a success response
    // res.status(201).json({ message: 'Address added successfully', address: newAddress });
  } catch (error) {
    // Handle errors
    console.error('Error adding address:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};










module.exports = {
  addToCart,
  cartLoad,
  getCartCount,
  removeFromCart,
  checkOutLoad,
  updateAddressCheckout,
  editAddressCheckout,
  deleteAddressCheckout,
  updateCart,
  checkoutaddAddressLoad,
  checkoutaddAddressPost,
  quantityUpdate
}