const mongoose = require(`mongoose`);

const AppointSchema = new mongoose.Schema({

    flname: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    textarea: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true,
    },
    disease: {
        type: String,


    },
    newDate: {
        type: String,


    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // This should match the name of your User model
    },
    date_added: {
        type: Date,
        default: Date.now()
    }

});

const ConSchema = new mongoose.Schema({

    fname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    pn: {
        type: String,
        required: true
    },

    visitb: {
        type: String,
        required: true,
    },
    topic: {
        type: String,
        required: true
    },
    mesg: {
        type: String,
        required: true
    },
    date_added: {
        type: Date,
        default: Date.now()
    }
});

const Contact = new mongoose.model(`contactUs`, ConSchema);
const Appointment = new mongoose.model(`appointment`, AppointSchema);

module.exports = {
    Appointment,
    Contact
};

