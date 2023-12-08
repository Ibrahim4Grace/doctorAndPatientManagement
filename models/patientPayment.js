const mongoose = require(`mongoose`);


const paymentSchema = new mongoose.Schema({
  
    patientName: {

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
    email: {

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
    user_id: {
        type: mongoose.Schema.Types.ObjectId, // Use the ObjectID type
        ref: 'User' // Reference the User model
       
    },
});

const expensesSchema = new mongoose.Schema({
    expenseType: {
        type: String,
        required: true
    },
    expenseDate: {

        type: String,
        required: true
    },
    expenseAmount: {

        type: String,
        required: true
    },
    expenseVendorSupplier: {

        type: String,
        required: true
    },
    expenseCategoryDepartment: {

        type: String,
        required: true
    },
    expenseAuthorizedBy: {

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
    image: {

        data:Buffer,
        contentType:String
    }
});


const PatientPayment = mongoose.model('patientPayment', paymentSchema);
const HospitalExpenses = mongoose.model('hospitalExpenses', expensesSchema);



module.exports = {
    PatientPayment,
    HospitalExpenses
};

