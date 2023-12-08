const mongoose = require(`mongoose`);
const AdminSchema = new mongoose.Schema({

    fullName:{
        type: String,
        required: true
    },
    username:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    adminAddress:{
        type: String,
        required: true
    },
    adminNumber:{
        type: String,
        required: true
    },
    image: {

        data: Buffer,
        contentType: String
    },
    email:{
        type: String,
        required: true
    },
    role:{
        type: String,
        required: true
    },
    date_added: {
        type: Date,
        default: Date.now()
    }

});



const Admin = mongoose.model('adminData', AdminSchema);

module.exports =  Admin

