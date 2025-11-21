const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel')

const createCat = async (req, res) => {
  try {
    res.render('./admin/createCategory', { layout: './admin/admin-layout' })
  } catch (error) {
    console.log(error.message)
  }
}

const getCategory = async (req, res) => {
  try {
    const categoryData = await Category.find();
    const offer = await Offer.find().lean()
    res.render('./admin/categoryList', { category: categoryData, layout: './admin/admin-layout', offer })
  } catch (error) {
    console.log(error.message)
  }
}

const addingCat = async (req, res) => {
  try {
    res.render('./admin/add-category', { layout: './admin/admin-layout' })
  } catch (error) {
    console.log(error.message)
  }
}



const addCategory = async (req, res) => {
  const category = new Category({
    name: req.body.name
  });

  try {
    const newCategory = await category.save();
    res.redirect('/admin/categoryList');
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}


const categoryAdd = async (req, res) => {
  try {
    // Get the category name from the request body
    const categoryName = req.body.name;

    // Create a regex pattern for case-insensitive matching
    const regexPattern = new RegExp(`^${categoryName}$`, 'i');

    // Check if any variation of the category name already exists
    const existingCategory = await Category.findOne({ name: regexPattern });
    if (existingCategory) {
      const categoriesData = await Category.find().lean();
      return res.render("./admin/categoryList.hbs", {
        category: categoriesData,
        layout: './admin/admin-layout',
        message: 'Category already exists'
      });
    }

    // If the category doesn't exist, create and save it
    const category = new Category({
      name: categoryName
    });

    const categoryData = await category.save();
    console.log(categoryData);

    // Fetch all categories and render the category list page
    const categoriesData = await Category.find().lean();
    res.render("./admin/categoryList.hbs", {
      category: categoriesData,
      layout: './admin/admin-layout'
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).render('error', { message: "An error occurred. Please try again later." });
  }
};


const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const categoryData = await Category.find({ _id: id }).lean();
    console.log(categoryData);
    if (categoryData) {
      res.render("./admin/edit-category", { categoryData, layout: './admin/admin-layout' });
    } else {
      res.redirect("/admin/categoryList");
    }
  } catch (error) {
    console.log(error);
  }
};


const updateCategory = async (req, res) => {
  try {
    // await User.find({ _id: req.params.id }).lean();
    await Category.updateOne({ _id: req.params.id }, {
      $set: {
        name: req.body.name,

      }
    }).lean();

    const categoryData = await Category.find().lean();
    console.log(categoryData);

    if (categoryData)

      res.render("./admin/categoryList", { category: categoryData, layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};


//   const deleteCategory= async (req, res) => {
//     try {
//         const category = await Category.findById(req.params.id);
//         if (!category) {
//             return res.status(404).json({ message: 'Category not found' });
//         }
//         category.isdeleted = true;
//         await category.save();
//         res.json({ message: 'Category soft deleted successfully' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

// const deleteCategory = async (req, res) => {
//   try {

//     await Category.find({ _id: req.params.id }).lean();
//     await Category.deleteOne({ _id: req.params.id  });
//     Category.isdeleted = true
//      await Category.save()
//     const categoryData= await Category.find().lean();
//     console.log(categoryData);

//     res.render("./admin/categoryList", {category: categoryData});
//   } catch (error) {
//     console.log(error.message);
//   }
// };
const deleteCategory = async (req, res) => {
  try {
    const catId = req.params.id
   
    const category = await Category.findOneAndUpdate({ _id: (catId) }, { $set: { isDeletd: true } })
    console.log(category)

    await category.save();

    const categoryData = await Category.find().lean();
    console.log(categoryData);

    res.render("./admin/categoryList", { category: categoryData, layout: './admin/admin-layout' });
  } catch (error) {
    return res.status(400).json({
      success: false,
      msg: error.message
    })

  }
}




module.exports = {
  createCat,
  getCategory,
  addCategory,
  categoryAdd,
  addingCat,
  editCategory,
  updateCategory,
  deleteCategory

}