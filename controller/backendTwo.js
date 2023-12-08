const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require(`bcrypt`) //TO HASH OUR PASSWORD 
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

router.use(bodyParser.json());


const app = express();
const MedicalRecord = require('../models/addmedicalrecord');
const { Appointment, Contact } = require('../models/appointment');
const  User = require('../models/User');
const { Doctors, DoctorPayment } = require('../models/doctors');
const notRegistered = require('../models/unregis_patient');
const    { HospitalExpenses, PatientPayment }  = require('../models/patientPayment');


// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});

// Passport config
const initializePassport = require('../config/passport');


                   //EDIT PATIENT SECTIONS
router.get(`/backend/editPatient/:m_id`, checkAuthenticated, async(req, res) => {

    const admin = req.user; 


    const prop = User.findOne({ _id: req.params.m_id })

        .then((recs) => {

            res.render(`backend/editPatient`, { admin, editUser: recs })
        })

        .catch((err) => {

            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/allpatients');
            console.log(err);
        })

   
});

//IF WE WANT OUR IMAGES TO GO INOT DIFFERENT FOLDER
let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/patientImage/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now())
    }
});

const upl = multer({ storage: storage });


router.post(`/editPatient/:mu_id`, checkAuthenticated, upl.single('image'), async (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;

    const { name, email, gender, dob, number, address, password, occupation,diagnosis,treatment,bloodGroup } = req.body;
    const admin = req.user;

    // Check if a new image was uploaded
    let newImage = {};
    if (req.file) {
        newImage = {
            data: fs.readFileSync(path.join(__dirname, '../public/patientImage/' + req.file.filename)),
            contentType: 'image/png',
        };
    }

    // Find the existing admin to get the current image
    const existingUser = await User.findById(mu_id);

    // Retain the existing image or use the new image
    const userImage = req.file ? newImage : (existingUser ? existingUser.image : {});

    // Hash the new password
    console.log(password);


      // Check if a new password was provided
    if (password && password !== existingUser.password) {
    // Hash the new password
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) {
                console.error(err);
                res.send('Error hashing password');
            } else {
                // Update the document with the hashed password
                try {
                    await User.findByIdAndUpdate(mu_id, {
                        $set: {
                            name,
                            email,
                            gender,
                            dob,
                            number,
                            address,
                            password:hash,
                            occupation,
                            diagnosis,
                            treatment,
                            bloodGroup,
                            image: userImage, // Use the existing or new image
                            admin,


                        

                        }
                    });

                    req.flash('success_msg', 'Information Successfully Updated');
                    res.redirect('/backend/allpatients');
                } catch (error) {
                    console.error(error);
                    res.send('Error updating patient');
                }
            }
        });
    });
   } else {
        // Password field is empty or not changed, don't update the password
    try {
        await User.findByIdAndUpdate(mu_id, {
            $set: {
                name,
                email,
                gender,
                dob,
                number,
                address,
                occupation,
                diagnosis,
                treatment,
                bloodGroup,
                image: userImage, // Use the existing or new image
                admin,
            }
        });

        req.flash('success_msg', 'Information Successfully Updated');
        res.redirect('/backend/allpatients');
       } catch (error) {
        console.error(error);
        res.send('Error updating patient');
       }
   }


});

router.get(`/deleteRegisteredPatient/:m_id`, checkAuthenticated, (req, res) => {

    const mid = req.params.m_id;
    User.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Patient deleted successfully');
            res.redirect(`/backend/allpatients`)
        })
        .catch(() => {

            res.send(`error`)
        })
});


                                 //UNREGISTRED PATIENTS

router.get(`/backend/unregis_patient`, checkAuthenticated, async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await notRegistered.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);
    const admin = req.user;

    const unregisteredPatient = await notRegistered.find()
        .skip((page - 1) * perPage)
        .limit(perPage);

    res.render('backend/unregis_patient', { admin, unregisteredPatient, totalPages, currentPage: page });


});

                                 // SEARCH UNREGISTRED PATIENTS
router.post(`/searchUnregisterPatient`, checkAuthenticated, async (req, res) => {
    try {
        const unregisterName = req.body.name; // Use req.body to get the name from the form input

        // Use a regular expression to perform a case-insensitive search for the patient's name
        const query = {
            name: { $regex: new RegExp(unregisterName, 'i') } // 'i' for case-insensitive
        };

        const admin= req.user;

        const outputUnregisterList = await notRegistered.find(query);

        res.render('backend/unregisterPatientResult', { outputUnregisterList,admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/unregis_patient');
    }
});

                                      // MOVED TO REGISTERED TABLE
// Define the generateUniqueNumber function
function generateUniqueNumber() {
    // Your logic to generate a unique number here
    return Math.floor(1000 + Math.random() * 9000);
}

// Define the generatePatientID function
function generatePatientID() {
    // Your logic to generate a unique patient ID here
    const prefix = 'PT';
    const uniqueNumber = generateUniqueNumber();
    const newPatientID = `${prefix}${uniqueNumber}`;
    return newPatientID;
}

router.get('/backend/registerPatient/:id', checkAuthenticated, async (req, res) => {
    try {
        const patientToRegister = await notRegistered.findById(req.params.id);
    
        if (!patientToRegister) {
            return res.status(404).send('Patient not found');
        }
    
        // Generate a new unique patient ID (ensure it's unique)
        let newPatientID;
        let isUnique = false;
        while (!isUnique) {
            newPatientID = generatePatientID();
            // Check if the generated patient ID already exists in registered patients
            const patientIDExists = await User.findOne({ patientID: newPatientID });
            if (!patientIDExists) {
                isUnique = true;
            }
        }

        // Create a new record in the "allpatients" collection with patientToRegister's data
        const newPatient = new User({
            name: patientToRegister.name,
            email: patientToRegister.email,
            number: patientToRegister.number,
            password: patientToRegister.password,
            dob: patientToRegister.dob,
            gender: patientToRegister.gender,
            patientID: newPatientID // Assign the generated patient ID
        });
    
        // Save the new patient record
        await newPatient.save();
    
        // Attempt to remove the patient from the "notRegistered" collection
        try {
            // First, remove the patient from the "notRegistered" collection using findByIdAndRemove
            const removedPatient = await notRegistered.findByIdAndRemove(req.params.id);
            console.log(`Removed patient: ${removedPatient}`);
        } catch (removeError) {
            console.error('Error removing patient:', removeError);
        }
    
        res.redirect('/backend/allpatients'); // Redirect to the "allpatients" page after registration
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});


router.get(`/delete_unregister/:m_id`, checkAuthenticated, (req, res) => {


    const mid = req.params.m_id;
    notRegistered.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Data deleted successfully');
            res.redirect(`/backend/unregis_patient`)
        })
        .catch(() => {

            res.send(`Data deleted successfully`)
        })
});

                                // PATIENTS PAYMENT BILLS

router.get(`/backend/patientPayment`, checkAuthenticated, async (req, res) => {
    try {
        const users = await User.find({}, 'name');
        const admin = req.user;

        const page = parseInt(req.query.page) || 1;
        const perPage = 8; // Number of items per page
        const totalPosts = await PatientPayment.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const patientPayment = await PatientPayment.find()
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/patientPayment', { patientPayment, admin, totalPages, currentPage: page, users });
    } catch (err) {
        console.error(err);
        // Handle any errors
        res.status(500).send('Internal Server Error');
    }
});


router.post(`/searchPatientPay`, checkAuthenticated,  async (req, res) => {
    try {
        const admin = req.user;
        const Patientpay = req.body.patientName; // Use req.body to get the name from the form input

        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            patientName: { $regex: new RegExp(Patientpay, 'i') } // 'i' for case-insensitive
        };

        const patientPayment = await PatientPayment.find(query);
        res.render('backend/searchPatientPay', { patientPayment, admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/patientPayment');
    }
});



router.post(`/patientPayment`,checkAuthenticated,  (req, res) => {
    // USING DATA destructuring
    const { patientName, paymentPurpose, paymentDate, totalAmount, email, paymentMethod, paymentStatus } = req.body;
   const admin = req.user;

    //check required fields
    if (!patientName || !paymentPurpose || !paymentDate || !totalAmount || !email || !paymentMethod || !paymentStatus) {
        req.flash(`error`, `Please fill all fields`);
        res.redirect(`/backend/patientPayment`);
    } else {

        const newPatientPayment = new PatientPayment({
            patientName,
            paymentPurpose,
            paymentDate,
            totalAmount,
            email,
            paymentMethod,
            paymentStatus,
            admin
        });

        //TO SAVE INTO DATABASE INPUT
        try {
            newPatientPayment.save();
            let msg =
                'Dear ' + patientName + ", We are pleased to inform you that your payment has been successfully received. We greatly appreciate your patronization to Korex hospital.\n\n" +

                "Payment Details:\n\n" +

                "Patient Name: " + patientName + "\n" +
                "Amount: " + totalAmount + "\n" +
                "Payment Date: " + paymentDate + "\n" +
                "Payment Method: " + paymentMethod + "\n" +
                "Payment Purpose: " + paymentPurpose + "\n" +
                "Payment Status: " + paymentStatus + "\n\n" +
                
                "If you have any questions or concerns regarding your payment or need further assistance, please don't hesitate to contact our Human Resources department. Your satisfaction is important to us, and we are here to assist you.\n\n" +
                
                "Thank you for your continued commitment to Korex hospital, and we look forward to your continued contributions in the future..\n\n" +
                 "Best regards,\n" +
                 "Korex Hospital Team";


            const mailOptions = {
                from: 'ibro4grace@gmail.com',
                to: email,
                subject: ' Bill Payment Confirmation',
                text: msg,

            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Email sending error:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
            // res.send(`Movie Successfully saved into DB`);
            req.flash('success_msg', 'Payment Successful');
            res.redirect('/backend/patientPayment');
        } catch (err) {
            console.log(err);
            req.flash('error', 'An error occurred while booking the appointment');
            res.redirect('/backend/patientPayment');

        }
    }


});


router.get(`/deletePays/:mu_id`,checkAuthenticated, (req, res) => {


    const mid = req.params.mu_id;
    PatientPayment.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Data deleted successfully');
            res.redirect(`/backend/patientPayment`)
        })
        .catch(() => {

            res.send(`error`)
        })
});

                                //DOCTORS PAYMENT SECTIONS

router.get(`/backend/doctorPayment`, checkAuthenticated, async (req, res) => {
    try {
        // pupulatiin the doctor name, speciality and email
        const doctors = await Doctors.find({}, 'flname specialty email');
        const admin = req.user;

        const page = parseInt(req.query.page) || 1;
        const perPage = 6; // Number of items per page
        const totalPosts = await DoctorPayment.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const doctorPayment = await DoctorPayment.find()
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/doctorPayment', { doctorPayment,admin, doctors, totalPages, currentPage: page });
    } catch (err) {
        console.error(err);
        // Handle any errors
        res.status(500).send('Internal Server Error');
    }
});

router.get('/api/doctors', async (req, res) => {
    try {
        // Retrieve the list of doctors from your database using await
        const doctors = await Doctors.find({}, 'flname email specialty');

        // Send the list of doctors as JSON
        res.json(doctors);
    } catch (error) {
        console.error("Error fetching doctor data:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



router.post(`/doctorPayment`, checkAuthenticated, (req, res) => {
    // USING DATA destructuring
    const { doctorName, doctorEmail, speciality, paymentPurpose, paymentDate, totalAmount, paymentMethod, paymentStatus } = req.body;
    const admin = req.user;

    //check required fields
    if (!doctorName || !doctorEmail || !speciality || !paymentPurpose || !paymentDate || !totalAmount  || !paymentMethod || !paymentStatus) {
        req.flash(`error`, `Please fill all fields`);
        res.redirect(`/backend/doctorPayment`);
    } else {

        const newDoctorPayment = new DoctorPayment({

           
            doctorName,
            doctorEmail,
            speciality,
            paymentPurpose,
            paymentDate,
            totalAmount,
            paymentMethod,
            paymentStatus,
            admin
        });

        //TO SAVE INTO DATABASE INPUT
        try {
            newDoctorPayment.save();
            let msg =
                'Dear ' + doctorName + ", We are pleased to inform you that your salary payment for the month of " + paymentDate + " has been successfully processed and paid. We greatly appreciate your hard work and dedication to Korex hospital.\n\n" +

                "Salary Payment Details:\n\n" +

                "Doctor Name: " + doctorName + "\n" +
                "Amount: " + totalAmount + "\n" +
                "Payment Date: " + paymentDate + "\n" +
                "Payment Method: " + paymentMethod + "\n" +
                "Payment Purpose: " + paymentPurpose + "\n" +
                "Payment Status: " + paymentStatus + "\n\n" +
                
                "If you have any questions or concerns regarding your salary payment or need further assistance, please don't hesitate to contact our Human Resources department. Your satisfaction is important to us, and we are here to assist you.\n\n" +
                
                "Thank you for your continued commitment to Korex hospital, and we look forward to your continued contributions in the future..\n\n" +
                 "Best regards,\n" +
                 "Korex Hospital Team";


            const mailOptions = {
                from: 'ibro4grace@gmail.com',
                to: doctorEmail,
                subject: 'Salary Payment Confirmation',
                text: msg,

            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Email sending error:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
            
            req.flash('success_msg', doctorName + ' Payment Successful');
            res.redirect('/backend/doctorPayment');
        } catch (err) {
            console.log(err);
            req.flash('error', 'An error occurred while making your Payment');
            res.redirect('/backend/doctorPayment');

        }
    }


});

router.post(`/searchDoctorPayment`, checkAuthenticated, async (req, res) => {

    try {
        const docPay = req.body.doctorName; // Use req.body to get the name from the form input
        const admin = req.user;
        
        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            doctorName: { $regex: new RegExp(docPay, 'i') } // 'i' for case-insensitive
        };

        const doctorPayment = await DoctorPayment.find(query);
        res.render('backend/docPayResult', { doctorPayment, admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/doctorPayment');
    }
});


router.get(`/backend/editDoctorPayment/:m_id`, checkAuthenticated, async(req, res) => {
    const admin =req.user;
    const doc = DoctorPayment.findOne({ _id: req.params.m_id })

        .then((recs) => {

            res.render(`backend/editDoctorPayment`, { doctorPayments: recs, admin})
        })

        .catch((err) => {

            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/doctorPayment');
            console.log(err);
        })
})


router.post(`/editDoctorPayment/:mu_id`, checkAuthenticated, (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;
    const admin = req.user;
    const { doctorName, doctorEmail, speciality, paymentPurpose, paymentDate, totalAmount, paymentMethod, paymentStatus } = req.body;
    

    DoctorPayment.findByIdAndUpdate(mu_id, { $set: { doctorName, doctorEmail, speciality, paymentPurpose, paymentDate, totalAmount, paymentMethod, paymentStatus } })

        .then(() => {

            let msg = 'Dear ' + doctorName + `,\n\n` +

                `We hope this message finds you well. We wanted to inform you about a recent update regarding your payment confirmation. Here are the details of the update:.\n\n` +

                'New Information:\n\n' +
                "Doctor Name: " + doctorName + "\n" +
                "Amount: " + totalAmount + "\n" +
                "Payment Date: " + paymentDate + "\n" +
                "Payment Method: " + paymentMethod + "\n" +
                "Payment Purpose: " + paymentPurpose + "\n" +
                "Payment Status: " + paymentStatus + "\n\n" +
             

                "If you have any questions or concerns regarding this update or your payment, please don't hesitate to contact our billing department at 2347033731378. We're here to assist you..\n\n" +

                "We appreciate your continued dedication and hard work as a member of our healthcare team. Thank you for choosing to be a part of Korex hospital...\n\n" +

                "warm regards,\n" +
                "Korex Hospital";

            const mailOptions = {
                from: 'ibro4grace@gmail.com',
                to: doctorEmail,
                subject: 'Payment Confirmation Update',
                text: msg,


            };


            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Email sending error:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
            // res.send(`Successfully Edited`)
            req.flash(`success_msg`, doctorName + ' Information Successfully Updated');
            res.redirect('/backend/doctorPayment');

        })
        .catch((err) => {
            console.log(err)
            res.send(`There is issue with your information`)
            res.redirect('/backend/doctorPayment');

        })



});

router.get(`/deleteDoctorPay/:mu_id`, checkAuthenticated, (req, res) => {


    const mid = req.params.mu_id;
    DoctorPayment.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Doctor payment deleted successfully');
            res.redirect(`/backend/doctorPayment`)
        })
        .catch(() => {

            res.send(`error`)
        })
});


                                           //HOSPITAL EXPENSES 

router.get(`/backend/hospitalExpenses`, checkAuthenticated, async (req, res) => {
    const admin = req.user;
    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await HospitalExpenses.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const hospitalExpenses = await HospitalExpenses.find()
        .skip((page - 1) * perPage)
        .limit(perPage);

    res.render('backend/hospitalExpenses', { hospitalExpenses,admin, totalPages, currentPage: page });


});

            //HOSPITAL EXPENSES IMAGES STORAGE
let st = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/expensesImages/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now())
    }
});
const upld = multer({ storage: st });


router.post(`/hospitalExpenses`, checkAuthenticated,  upld.single('image'),(req, res) => {

    const admin = req.user;
    // USING DATA destructuring
    const { expenseType, expenseDate, expenseAmount, expenseVendorSupplier, expenseCategoryDepartment, expenseAuthorizedBy, paymentMethod,paymentStatus } = req.body;


    //check required fields
    if (!expenseType || !expenseDate || !expenseAmount || !expenseVendorSupplier || !expenseCategoryDepartment || !expenseAuthorizedBy || !paymentMethod || !paymentStatus) {
        req.flash(`error`, `Please fill all fields`);
        res.redirect(`/hospitalExpenses`);
    }  // Check if an image was uploaded
   
     else {

        const newHospitalExpenses = new HospitalExpenses({

            expenseType,
            expenseDate,
            expenseAmount,
            expenseVendorSupplier,
            expenseCategoryDepartment,
            expenseAuthorizedBy,
            paymentMethod,
            paymentStatus,
            image: {
                data: fs.readFileSync(path.join(__dirname, '../public/expensesImages/' + req.file.filename)),
                contentType: 'image/png'
            },
            admin
            
        })

        //TO SAVE INTO DATABASE INPUT
        try {
            newHospitalExpenses.save();
           
            // res.send(`Movie Successfully saved into DB`);
            req.flash('success_msg', expenseType + ' Expense added successfully');
            res.redirect('/backend/hospitalExpenses');
        } catch (err) {
            console.log(err);
            req.flash('error', 'An error occurred while adding the expense');
            res.redirect('/backend/hospitalExpenses');

        }
    }


});


router.post(`/searchHospitalExpenses`,checkAuthenticated, async (req, res) => {
    try {
        const admin = req.user;
        const expenses = req.body.expenseType; // Use req.body to get the name from the form input

        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            expenseType: { $regex: new RegExp(expenses, 'i') } // 'i' for case-insensitive
        };

        const hospitalBill = await HospitalExpenses.find(query);
        res.render('backend/hospitalExpSearch', { hospitalBill, admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/hospitalExpenses');
    }
});


router.get(`/backend/editHospiExpense/:m_id`, checkAuthenticated,  (req, res) => {

    const admin = req.user;
    const pat = HospitalExpenses.findOne({ _id: req.params.m_id })

        .then((recs) => {

            res.render(`backend/editHospiExpense`, { hospitalExpenses: recs , admin})
        })

        .catch((err) => {

            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/hospitalExpenses');
            console.log(err);
        })
})


router.post(`/editHospiExpense/:mu_id`, checkAuthenticated, (req, res) => {
    let errors = [];
    const admin = req.user;

    const mu_id = req.params.mu_id;

    const { expenseType, expenseDate, expenseAmount, expenseVendorSupplier, expenseCategoryDepartment, expenseAuthorizedBy, paymentMethod,paymentStatus } = req.body;

    HospitalExpenses.findByIdAndUpdate(mu_id, { $set: {expenseType, expenseDate, expenseAmount, expenseVendorSupplier, expenseCategoryDepartment, expenseAuthorizedBy, paymentMethod,paymentStatus } })

        .then(() => {
            // res.send(`Successfully Edited`)
            req.flash(`success_msg`, expenseType + ' Expenses Successfully Updated');
            res.redirect('/backend/hospitalExpenses');

        })
        .catch((err) => {
            console.log(err)
            res.send(`There is issue with your information`)
            res.redirect('/backend/hospitalExpenses');

        })



});

router.get(`/deletehospital/:mu_id`, checkAuthenticated, (req, res) => {


    const mid = req.params.mu_id;
    HospitalExpenses.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Data deleted successfully');
            res.redirect(`/backend/hospitalExpenses`)
        })
        .catch(() => {

            res.send(`error`)
        })
});


   //LOGOUT ADMIN

// HTML DOESNT SUPPOT DELETE WE NPM I METHOD-OVERRIDE
router.delete('/logout', (req, res) => {
    req.logOut(function(err) {
        if (err) {
            console.error(err);
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '-1');
        req.session.destroy(); // Clear the session
        res.redirect('/backend/adminlogin'); // Redirect to the login page
    });
});


//CHECKING IF ADMIN IS AUTHENTICATED WONT ALLOW YOU TO VISIT DASHBOARD IF YOU'RE NOT LOGIN
function checkAuthenticated(req, res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/backend/adminlogin');
}


//if User is authenticated you cant go out till you sign out
function checkNotAuthenticated(req, res,next){
    if(req.isAuthenticated()){
       return res.redirect('/backend/dashboard')
    }
    //keeps inside dashboard
   next()
}

module.exports = router;

