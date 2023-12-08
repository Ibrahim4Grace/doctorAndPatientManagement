const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({

    diagnosis: {
        type: String,
        required: true
    },
    treatment: {
        type: String,
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId, // Use the ObjectID type
        ref: 'User', // Reference the User model
       
    },
    
    date: {
        type: String,
        required: true
    }

});



const MedicalRecord = mongoose.model('medicalRecord', MedicalRecordSchema);

module.exports = MedicalRecord
