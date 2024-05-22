const mongoose = require('mongoose')




const passwordResetSchema= mongoose.Schema({

        userId:{
            type:String,
            required: true,
            ref: 'User'
        },
        token:{
            type:String,
            required: true
        },
      

        
    })

    

    module.exports = mongoose.model('PasswordReset', passwordResetSchema);