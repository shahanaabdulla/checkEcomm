const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Order = require('../models/orderModel')

const loadLogin = async (req, res) => {
  try {
    res.render("./admin/login.hbs", { excludeNavbar: true });
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    res.render("./admin/dashboard.hbs", { layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};
const loadAddUser = async (req, res) => {
  try {
    res.render("./admin/add-user.hbs", { layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};


const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const adminDashboard = async (req, res) => {
  try {
    const email = req.body.email
    const password = req.body.password


    if (email == 'admin@gmail.com' && password == 'admin') {

      req.session.admin = { loggedIn: true, adminId: email };

      res.render("./admin/dashboard.hbs", { layout: './admin/admin-layout' });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const getCustomers = async (req, res) => {
  try {
    const usersData = await User.find();
    res.render('./admin/userList', { users: usersData, layout: './admin/admin-layout' })
  } catch (error) {
    console.log(error.message)
  }
}

const addUser = async (req, res) => {
  try {
    const spassword = await securePassword(req.body.password);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mno,
      password: spassword,

      _v: 0,
    });

    const userData = await user.save();
    console.log(userData);

    const usersData = await User.find().lean();
    if (usersData)
      res.render("./admin/userList.hbs", { users: usersData, layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};

const editUserLoad = async (req, res) => {
  try {
    const id = req.params.id;
    const usersData = await User.find({ _id: id }).lean();
    console.log(usersData);
    if (usersData) {
      res.render("./admin/edit-user", { usersData, layout: './admin/admin-layout' });
    } else {
      res.redirect("/admin/usersList");
    }
  } catch (error) {
    console.log(error);
  }
};


const updateUser = async (req, res) => {
  try {
    // await User.find({ _id: req.params.id }).lean();
    await User.updateOne({ _id: req.params.id }, {
      $set: {
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mno,
      }
    }).lean();

    const usersData = await User.find().lean();
    console.log(usersData);

    if (usersData)
      // req.session.admin.adminid = req.body.email
      // let adminid = req.session.admin.adminid
      // console.log(adminid)
      res.render("./admin/userList", { users: usersData, layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};


const deleteUser = async (req, res) => {
  try {

    await User.find({ _id: req.params.id }).lean();
    await User.deleteOne({ _id: req.params.id });


    const usersData = await User.find().lean();
    console.log(usersData);

    res.render("./admin/userList", { users: usersData, layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};

const bestSellingProduct = async (req, res) => {
  try {
    const bestSellingProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      {
        $lookup: {
          from: "products", // Ensure the collection name matches your MongoDB collection
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }, // Limit the results to the top 10 best-selling products
      {
        $project: {
          productName: "$productDetails.name",
          totalSold: 1,
          image: "$productDetails.image" // Include the image field
        }
      }
    ]);

    res.json(bestSellingProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


const bestSellingCategory = async (req, res) => {
  try {
    const bestSellingCategories = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      {
        $lookup: {
          from: "categories", // Ensure the collection name matches your MongoDB collection
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: "$categoryDetails" },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $project: {
          categoryName: "$categoryDetails.name",
          totalSold: 1
        }
      }
    ]);

    res.json(bestSellingCategories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const bestSellingBrands = async (req, res) => {
  try {
    const bestSellingBrands = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.brand",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $project: {
          brandName: "$_id",
          totalSold: 1
        }
      }
    ]);

    res.json(bestSellingBrands);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};



var adminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/admin/login");
  });
};



module.exports = {
  loadLogin,
  loadAddUser,
  adminDashboard,
  addUser,
  getCustomers,
  editUserLoad,
  updateUser,
  deleteUser,
  adminLogout,
  loadDashboard,
  bestSellingProduct,
  bestSellingCategory,
  bestSellingBrands

}