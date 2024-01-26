const mongoose = require(`mongoose`);

const DocSchema = new mongoose.Schema({

    flname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true
    },
    specialty: {
        type: String,
        required: true
    },
    dob: {
        type: String,
        required: true

    }, address: {
        type: String,
        required: true

    }, username: {
        type: String,
        required: true

    },  password: {
        type: String,
        required: true

    }, facebook: {
        type: String,

    },twitter: {
        type: String,

    },
    linkedin: {
        type: String,

    },image: {

        data: Buffer,
        contentType: String
    },
    employeDate: {
        type: String,
        required: true
    },
    date_added: {
        type: Date,
        default: Date.now()
    }

});

const paymentSchema = new mongoose.Schema({
  
    doctorName: {

        type: String,
        required: true
    },
    doctorEmail: {

        type: String,
        required: true
    },
    speciality: {

        type: String,
        required: true
    },
    paymentPurpose: {

        type: String,
        required: true
    },
    paymentDate: {

        type: String,
        required: true
    },
    totalAmount: {

        type: String,
        required: true
    },
    paymentMethod: {

        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        required: true
    },
    date_added: {
        type: Date,
        default: Date.now()
    }
});

const Doctors = new mongoose.model(`doctors`, DocSchema);
const DoctorPayment = mongoose.model('doctorPayment', paymentSchema);

module.exports = {
    Doctors,
    DoctorPayment
};


