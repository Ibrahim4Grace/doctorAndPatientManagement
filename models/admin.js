const mongoose = require(`mongoose`);
const AdminSchema = new mongoose.Schema({

    
    adminFullName:{
        type: String,
        required: true
    },
    adminUsername:{
        type: String,
        required: true
    },
    adminPassword:{
        type: String,
        required: true
    },
    adminEmail:{
        type: String,
        required: true
    },
    adminNumber:{
        type: Number,
        required: true
    },
    adminAddress:{
        type: String,
        required: true
    },
    adminCity:{
        type: String,
        required: true
    },
    adminState:{
        type: String,
        required: true
    },
    adminRole:{
        type: String,
        required: true
    },
    adminDob:{
        type: String,
        required: true
    },
    adminEmergencyName:{
        type: String,
        required: true
    },
    adminEmergencyNumber:{
        type: Number,
        required: true
    },
    adminEmployDate:{
        type: String,
        required: true
    },
    image: {

        data: Buffer,
        contentType: String
    },
    date_added: {
        type: Date,
        default: Date.now()
    }

});


const Admin = mongoose.model('adminData', AdminSchema);

module.exports =  Admin
