
const isAuthenticated = (req, res, next) => {
  if (req.session.user_id) {
      res.locals.isAuthenticated = true;
  } else {
      res.locals.isAuthenticated = false;
  }
  next();
};



const isAuth = (req, res, next) => {
    if (req.session.user_id) {
      next();
    } else {
      res.redirect("/login");
    }
  };
  const isAccess = (req, res, next) => {
    if (req.session.user_id ){
      res.redirect("/");
    } else {
      next();
    }
  };
  


  
  
  module.exports = { isAuth, isAccess,isAuthenticated};