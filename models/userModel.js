const mongoose = require('mongoose')
const bcrypt=require("bcrypt")



const userSchema= mongoose.Schema({

        name:{
            type:String,
            required: true
        },
        email:{
            type:String,
            required: true
        },
        mobile:{
            type:Number,
            required: true
        },
        // image:{
        //     type:String,
        //     required: true
        // },
        password:{
            type:String,
            required: true
        },
        // is_admin:{
        //     type:Number,
        //     required: true
        // },
        is_verified:{
            type:Number,
            default:0,
        },
        otp: { 
            type: String,
                
            default: null
         },
         block:{
            type:Boolean,
            default:false
         },
         loggedIn: {
            type: Boolean,
            default: false
        },
        walletBalance: {
            type: Number,
            default: 0 // Initialize wallet balance to 0
        }


        
    })

   

    module.exports = mongoose.model('Users', userSchema);