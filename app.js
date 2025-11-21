require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const mongoose = require('mongoose');

const { isAuthenticated } = require('./midddlewares/auth');
// Routes
const indexRouter = require('./routes/admin');
const usersRouter = require('./routes/users');
const orderRouter = require('./routes/orders');
const offerRouter = require('./routes/offers');

// Require the helpers
require('./helpers/handlebarsHelpers');

const app = express();

const sessionSecret = process.env.SESSION_SECRET;
const database = process.env.DB_URL;

// Database Connection
mongoose.connect(database)
.then(() => console.log('database connected'))
.catch(err => console.log(err));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Session middleware
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true
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
app.use(isAuthenticated);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/admin', indexRouter);
app.use('/', usersRouter);
app.use('/order', orderRouter);
app.use('/offer', offerRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

