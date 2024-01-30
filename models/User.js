const mongoose = require(`mongoose`);

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    dob: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    occupation: {
        type: String,
        required: true
    },
    diagnosis: {
        type: String
    },
    treatment: {
        type: String  
    },
    patientID: {
        type: String 
    },
    image: {
        data: Buffer,
        contentType: String
    },
    bloodGroup: {
        type: String
    },
    failedLoginAttempts: {   
        type: Number,
        default: 0 
    },
    accountLocked: { 
        type: Boolean, 
        default: false 
    },
    date: {
        type: Date,
        default: Date.now()
    }

});


const User = mongoose.model('userInfo', UserSchema);


module.exports =  User