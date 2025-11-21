require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const mongoose = require('mongoose');
const createError = require('http-errors');

const { isAuthenticated } = require('./midddlewares/auth');

// Routes
const indexRouter = require('./routes/admin');
const usersRouter = require('./routes/users');
const orderRouter = require('./routes/orders');
const offerRouter = require('./routes/offers');

// Handlebars helpers
require('./helpers/handlebarsHelpers');

const app = express();

// Database Connection
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('Database connected'))
.catch(err => console.log('Database connection error:', err));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(flash());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
app.use(isAuthenticated);

// Routes
app.use('/admin', indexRouter);
app.use('/', usersRouter);
app.use('/order', orderRouter);
app.use('/offer', offerRouter);

// Catch 404
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Listen on Render port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
