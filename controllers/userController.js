const User = require('../models/userModel')
const Address = require('../models/addressModel')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer')
const Order = require('../models/orderModel')
const randomstring = require('randomstring')
const PasswordReset = require('../models/passwordReset');
const Product = require('../models/productModel')
const Offer = require('../models/offerModel');



const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash
    } catch (error) {
        console.log(error.message)
    }
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,

    auth: {
        user: 'duashaf123@gmail.com',
        pass: 'esbn xhtf zqmd reme'
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    },

});




const homeLoad = async (req, res) => {
    try {
        const offers = await Offer.find().populate('product').populate('categories');
        const productData = await Product.find();
        res.render('index.hbs', { product: productData, offers })
    } catch (error) {
        console.log(error.message)
    }
}





const loginLoad = async (req, res) => {
    try {
        res.render('login.hbs')
    } catch (error) {
        console.log(error.message)
    }
}
const signUpLoad = async (req, res) => {
    try {
        res.render('signup.hbs')
    } catch (error) {
        console.log(error.message)
    }
}



const signup_post = async (req, res) => {
    try {
        const spassword = await securePassword(req.body.password);

        const user = new User({
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mno,
            password: spassword,
        });

        function generateNumericOTP(length) {
            const digits = '0123456789';
            let otp = '';
            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * digits.length);
                otp += digits[randomIndex];
            }
            return otp;
        }
        // Generate OTP for the user
        const otp = generateNumericOTP(6);
        console.log(otp);
        user.otp = otp;
        await user.save();

        // Send OTP to user via email
        const mailOptions = {
            from: 'duashaf123@gmail.com',
            to: req.body.email, // Use req.body.email instead of email
            subject: 'Login OTP',
            text: `Your OTP for login is: ${otp}`,
        };

        // Send email and wait for it to complete
        transporter.sendMail(mailOptions);

        console.log('Email sent');

        // Render the OTP verification page
        res.render('verifyOtp', { email: req.body.email });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


const verifyLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userData = await User.findOne({ email: email });
        if (!userData) {
            return res.render('login', { message: "Incorrect email or password" });
        }
        if (userData.block) {
            return res.render('login', { message: 'User is blocked' });
        }


        // Compare the hashed password from the database with the password entered by the user
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.render('login', { message: "Incorrect email or password" });
        }
        await User.findByIdAndUpdate(userData._id, { $set: { loggedIn: true } });
        // Password is correct, set user ID in session and redirect to home page
        req.session.user_id = userData._id;
        res.redirect('/');
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).render('error', { message: "An error occurred. Please try again later." });
    }
}

const verifyOTP_post = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const userData = await User.findOne({ email });

        if (userData) { // Check if user exists

            if (userData.otp === otp) { // Compare the OTP
                // OTP is correct, perform further actions (e.g., log the user in)
                req.session.user_id = userData._id;
                //  res.render('index',{user:userData});
                res.redirect('/')
            } else {
                // OTP is incorrect
                res.render('verifyOtp', { message: 'Invalid OTP' });
            }
        } else {
            // User not found
            res.render('login', { message: 'user not found, please signup' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const resendOTP = async (req, res) => {
    const { email } = req.body;
    console.log(email)
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        function generateNumericOTP(length) {
            const digits = '0123456789';
            let otp = '';
            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * digits.length);
                otp += digits[randomIndex];
            }
            return otp;
        }
        const newOTP = generateNumericOTP(6);
        // Update OTP in user document
        user.otp = newOTP;
        await user.save();
        // Send OTP via email
        const mailOptions = {
            from: 'duashaf123@gmail.com',
            to: email,
            subject: 'Login OTP',
            text: `Your new OTP for login is: ${newOTP}`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: 'Error sending OTP' });
            } else {
                console.log('Email sent: ' + info.response);
                return res.render('verifyOTP')
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if the user is logged in
        const user = await User.findOneAndUpdate({ _id: userId, loggedIn: false }, { $set: { block: true } });
        const usersData = await User.find().lean();
        if (!user) {
            return res.render("./admin/userList", { users: usersData, layout: './admin/admin-layout', message: "User is currently logged in" });
        }


        const message = 'User successfully blocked';
        res.render("./admin/userList", { users: usersData, layout: './admin/admin-layout', message: message });
    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
};


const unBlockUser = async (req, res) => {
    try {
        const userId = req.params.id

        const user = await User.findOneAndUpdate({ _id: (userId) }, { $set: { block: false } })
        console.log(user)
        if (!user) {
            return res.status(404).json({ message: 'user not found' })
        }
        await user.save();
        const usersData = await User.find().lean();
        console.log(usersData);

        res.render("./admin/userList", { users: usersData, layout: './admin/admin-layout' });
    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        })

    }
}





const addAddressLoad = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        console.log()
        res.render('addAddress.hbs', { user_id })
    } catch (error) {
        console.log(error.message)
    }
}


const addAddressPost = async (req, res) => {
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
        const userAddresses = await Address.find({ user_id: userId });

        // Render the same hbs file with the user's addresses
        res.render('userDetails', { addresses: userAddresses })
        // Send a success response
        // res.status(201).json({ message: 'Address added successfully', address: newAddress });
    } catch (error) {
        // Handle errors
        console.error('Error adding address:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const deleteAddress = async (req, res) => {

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
        const remainingAddresses = await Address.find({ user_id: req.session.user_id });
        res.render('userDetails', { addresses: remainingAddresses })
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
}

const editAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).send('Address not found');
        }
        res.render('editAddress', { address });
    } catch (error) {
        console.error('Error rendering edit address form:', error);
        res.status(500).send('Internal Server Error');
    }
};


const updateAddress = async (req, res) => {
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
        const addresses = await Address.find({ user_id: req.session.user_id });

        // Render the userDetails page with all the user's addresses
        res.render('userDetails', { addresses });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).send('Internal Server Error');
    }
};



const getUserDetails = async (req, res) => {
    try {
        // Retrieve user ID from session
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(404).send('User ID not found in session');
        }

        const user = await User.findById(userId);
        const userAddresses = await Address.find({ user_id: userId });
        const orders = await Order.find({ userID: userId }).populate('items.product').sort({ createdAt: -1 })
        if (user.wallet && Array.isArray(user.wallet)) {
            user.wallet.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('userDetails', { user, addresses: userAddresses, orders });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const editUserLoad = async (req, res) => {
    try {
        const id = req.params.id;
        const usersData = await User.find({ _id: id }).lean();
        console.log(usersData);
        if (usersData) {
            res.render("./admin/edit-user", { usersData });
        }
    } catch (error) {
        console.log(error);
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id
        // await User.find({ _id: req.params.id }).lean();
        await User.updateOne({ _id: req.params.id }, {
            $set: {
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mno,
            }
        }).lean();

        const updatedUser = await User.findById(req.params.id).lean()
        const userAddresses = await Address.find({ user_id: userId });
        const orders = await Order.find({ userID: userId }).populate('items.product');


        // req.session.admin.adminid = req.body.email
        // let adminid = req.session.admin.adminid
        // console.log(adminid)
        res.render("userDetails", { user: updatedUser, addresses: userAddresses, orders });
    } catch (error) {
        console.log(error.message);
    }
};
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const userData = await User.findOne({ email });
        if (!userData) {
            return res.status(400).json({
                success: false,
                msg: "Email doesn't exist"
            });
        }
        const randomString = randomstring.generate();

        const passwordReset = new PasswordReset({ // Use PasswordReset instead of passwordReset
            userId: userData._id,
            token: randomString
        });
        await passwordReset.save();
        const mailOptions = {
            from: 'duashaf123@gmail.com',
            to: email,
            subject: 'Reset Password',
            html: '<p>Hii ' + userData.name + ',please click <a href="http://127.0.0.1:5000/reset-password?token=' + randomString + '">here</a> to Reset your password</p>'
        };
        transporter.sendMail(mailOptions, randomString);
        return res.render('forgotPassword', { msg: "Reset password link sent to your mail" })
    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
};
const forgotPasswordLoad = async (req, res) => {
    try {
        res.render('forgotPassword')
    } catch (error) {
        console.log(error.message)
    }
}

// Assuming you're using Express
const resetPasswordForm = async (req, res) => {
    try {
        const token = req.query.token;
        // Logic to verify the token and render the reset password form
        // For example:
        // Find the password reset document by token
        const passwordReset = await PasswordReset.findOne({ token });
        if (!passwordReset) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        // Render the reset password form with the token
        res.render('resetPasswordForm', { token });
    } catch (error) {
        console.error('Error handling reset password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const resetPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        // Verify if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Find the password reset request by token
        const passwordResetRequest = await PasswordReset.findOne({ token });
        if (!passwordResetRequest) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Check if the token has expired (optional)
        const tokenExpiration = new Date(passwordResetRequest.createdAt).getTime() + (24 * 60 * 60 * 1000); // Assuming token expires in 24 hours
        if (Date.now() > tokenExpiration) {
            // Token has expired
            await PasswordReset.deleteOne({ token });; // Remove the expired token from the database
            return res.status(400).json({ error: 'Token has expired' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password
        const user = await User.findById(passwordResetRequest.userId);
        console.log(user)
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.password = hashedPassword;
        await user.save();
        console.log(user)
        // Remove the password reset request from the database
        await PasswordReset.deleteOne({ token });;

        // Respond with success message
        return res.render('login')
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}




const userLogout = async (req, res) => {
    try {
        // Get the user ID from the session
        const userId = req.session.user_id;

        // Update the loggedIn flag to false
        await User.findByIdAndUpdate(userId, { $set: { loggedIn: false } });

        // Destroy the session
        req.session.destroy((err) => {
            if (err) throw err;
            res.redirect("/");
        });
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).render('error', { message: "An error occurred. Please try again later." });
    }
};







module.exports = { homeLoad, loginLoad, signUpLoad, signup_post, verifyLogin, verifyOTP_post, userLogout, blockUser, resetPassword, resetPasswordForm, forgotPasswordLoad, unBlockUser, resendOTP, forgotPassword, editAddress, updateAddress, deleteAddress, getUserDetails, editUserLoad, addAddressLoad, addAddressPost, updateUser }