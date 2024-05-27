const adminAuth = (req, res, next) => {
    if (req.session.admin && req.session.admin.loggedIn) {
      next();
    } else {
      res.redirect('/admin/login');
    }
  };

  module.exports=  adminAuth