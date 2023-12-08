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
        type: String

    },
    dob: {
        type: String
    },
    number: {
        type: String,
        required: true
    },
    address: {

        type: String
    },
    password: {

        type: String,
        required: true
    },

    occupation: {

        type: String
      
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
    date: {
        type: Date,
        default: Date.now()
    }

});


const User = mongoose.model('userInfo', UserSchema);


module.exports =  User