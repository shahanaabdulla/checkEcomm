const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    isDeletd:{
        type:Boolean,
        default:false
        
    }
    // colour:{
    //     type:String
        
    // }
   
})

module.exports = mongoose.model('Category', categorySchema);