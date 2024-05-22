
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");


const successGoogleLogin = async (req, res) => {
  try {
      const { email } = req.user;
      
      // Check if the user exists in the database
      const userData = await User.findOne({ email: email });
      
      if (!userData) {
          return res.render('login', { message: 'User not found' });
      }

      if (userData.block) {
          return res.render('login', { message: 'User is blocked' });
      }

   
      req.session.user_id = userData._id;
      res.redirect('/');
    }catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};
const failureGoogleLogin = (req, res) => {
    req.session.message = {
      type: false,
      message: "google signin failed",
    };
    res.redirect("/login");
  };
  
module.exports={
successGoogleLogin,
failureGoogleLogin
}