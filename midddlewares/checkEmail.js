const User = require('../models/userModel')



async function checkEmailExistence(req, res, next) {
    const email = req.body.email; // Assuming email is sent in the request body
    try {
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.render('signup',{msg:'Email already exists',user:existingUser});
        }
        // Email doesn't exist, proceed to signup
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}

 module.exports=checkEmailExistence;