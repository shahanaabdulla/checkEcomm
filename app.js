var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const flash = require('express-flash');

var session=require('express-session');
var hbs=require('express-handlebars')
const Handlebars = require('handlebars')
var mongoose=require('mongoose')

require('dotenv').config();
const passport = require('passport');
const {isAuthenticated,isAuth,isAccess}=require('./midddlewares/auth')

const GoogleStrategy = require('passport-google-oauth2').Strategy;



//const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')

var indexRouter = require('./routes/admin');
var usersRouter = require('./routes/users');
var orderRouter = require('./routes/orders')
var offerRouter = require('./routes/offers')

const { handlebars } = require('hbs');
handlebars.registerHelper('calculatePrice', (price, quantity) => price * quantity);
handlebars.registerHelper('calculateTotalPrice', (cartProducts) => {
  let totalPrice = 0;

  // Loop through each product in the cart and sum up their prices
  cartProducts.forEach((cartProduct) => {
      if (cartProduct.product.onOffer) {
          totalPrice += cartProduct.product.offerPrice * cartProduct.quantity;
      } else {
          totalPrice += cartProduct.product.price * cartProduct.quantity;
      }
  });

  // Return the total price
  return totalPrice.toFixed(2); // Assuming you want to display the total price with two decimal places
});


handlebars.registerHelper('isCurrentPage', (currentPage, pageNumber) => {
  return currentPage === pageNumber;
});

handlebars.registerHelper('formatDate', function(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(date).toLocaleDateString('en-US', options);
});


// Define a Handlebars helper to check for equality
handlebars.registerHelper('eq', function(val1, val2) {
  return val1 === val2;
});


handlebars.registerHelper('calculateOfferPrice', (price, discount) => {
    return (price - (price * (discount / 100))).toFixed(2);
});

// Handlebars helper to check for offer products
handlebars.registerHelper('hasOfferProducts', function(products, options) {
  let hasOffer = products.some(product => product.product.onOffer);
  return hasOffer ? options.fn(this) : options.inverse(this);
});

// Register a Handlebars helper to calculate offer discount

handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});









var app = express();

const sessionSecret = process.env.SESSION_SECRET;
const database = process.env.DB_URL

mongoose.connect(database)
.then(() => console.log('database connected'))
.catch(err => console.log(err));



// view engine setup
app.set('views', path.join(__dirname,'views'));
//app.engine('hbs',hbs.engine({extname:'hbs', defaultLayout:'layout',handlebars: allowInsecurePrototypeAccess(Handlebars), layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'views/partials/'}));
app.set('view engine','hbs');



app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true
  // Change to true if using HTTPS
}));

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-cache, no-store,max-age=0, must-revalidate"
  );
  next();
});


app.use(flash());
app.use(logger('dev'));
app.use(isAuthenticated)

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));






app.use('/admin', indexRouter);
app.use('/', usersRouter);
app.use('/order',orderRouter)
app.use('/offer',offerRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(5000);
