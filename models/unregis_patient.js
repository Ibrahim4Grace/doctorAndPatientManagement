const mongoose = require(`mongoose`);

const UnregisterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
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
    password: {

        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
    }
});


const notRegistered = mongoose.model('unregisteredPatient', UnregisterSchema);


module.exports = notRegistered

