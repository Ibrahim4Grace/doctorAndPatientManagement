const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');


const app = express();
const  User = require('../models/User');
const  Admin  = require('../models/admin');
const { Doctors, DoctorPayment } = require('../models/doctors');
const { Appointment, Contact } = require('../models/appointment');
const notRegistered = require('../models/unregis_patient');
const MedicalRecord = require('../models/addmedicalrecord');


// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});



                       //Welcome admin dashboard
  router.get('/backend/dashboard',  checkAuthenticated, async (req, res) => {

    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    //pagination
    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await Appointment.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const admin = req.user; // Access the authenticated admin user
  
            const appointment = await Appointment.find().sort({ date: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);
    
    
     res.render('backend/dashboard', { appointment, admin, totalPages, currentPage: page }); // Handle the case where the admin is not found
      
});

                           //ADMIN SECTIONS
router.get(`/backend/admin`, checkAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 5; // Number of items per page
    const totalPosts = await Admin.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    // Assuming that you have access to the currently signed-in admin's ID
    const admin = req.user; // Adjust this based on your authentication setup


    const adminResults = await Admin.find().sort({ date: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
    res.render('backend/admin', { adminResults, admin, totalPages, currentPage: page });

});



//IF WE WANT OUR IMAGES TO GO INOT DIFFERENT FOLDER
let stor = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/adminImage/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now())
    }
});
const uploads = multer({ storage: stor });

                                              //ADMIN POST  SECTIONS
  router.post('/addAdmin', checkAuthenticated, uploads.single('image'), (req, res) => {


    const { fullName, username, password, password2, adminAddress, adminNumber, email, role } = req.body;
    const admin = req.user; 
    let errors = [];

    //check required fields
    if (!fullName || !username || !password || !password2 || !adminAddress || !adminNumber || !email || !role) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    //check passwords match
    if (password !== password2) {
        errors.push({ msg: 'Password do not match' });
    }

    //Check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    //if all check complet
    if (errors.length > 0) {
        res.render('backend/admin', {
            errors,
            fullName,
            username,
            password,
            password2,
            adminAddress,
            adminNumber,
            email,
            role,
            admin,
        });

    } else {

        //Validation Passed
        Admin.findOne({ username: username })
            .then(admin => {
                if (admin) {
                    //User exist
                    errors.push({ msg: 'Username already registered' });
                    res.render('backend/admin', {
                        errors,
                        fullName,
                        username,
                        password,
                        password2,
                        adminAddress,
                        adminNumber,
                        email,
                        role,
                        admin,
                    });

                } else {
                    const newAdmin = new Admin({
                        fullName,
                        username,
                        password,
                        adminAddress,
                        adminNumber,
                        email,
                        role,
                        image: {
                            data: fs.readFileSync(path.join(__dirname, '../public/adminImage/' + req.file.filename)),
                            contentType: 'image/png'
                        },
                        admin,
                     
                    });
                    //IF YOU DONT WANT YOUR PASSWORD TO SAVE IN PLAIN TEXT USE HASH PASSWORD
                    bcrypt.genSalt(10, (err, salt) => bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                        if (err) throw err;
                        //SET PASSWORD TO HASHED
                        newAdmin.password = hash;

                        //Save into DB
                        newAdmin.save()
                            .then(admin => {
                                req.flash('success_msg', 'Admin now registered..');
                                res.redirect('/backend/admin');
                            })
                            .catch(err => {
                                
                                console.error(err);
                                res.redirect('/backend/dashboard');
                            });
                           
                    }))

                }
            });
    }

  });


                   //EDIT ADMIN SECTIONS
router.get(`/backend/editAdmin/:m_id`, checkAuthenticated, async(req, res) => {

    const admin = req.user; 


    const prop = Admin.findOne({ _id: req.params.m_id })

        .then((recs) => {

            res.render(`backend/editAdmin`, { admin,adminResults: recs })
        })

        .catch((err) => {

            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/admin');
            console.log(err);
        })

   
});

router.post(`/editAdmin/:mu_id`, checkAuthenticated, uploads.single('image'), async (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;

    const { fullName, username, password, adminAddress, adminNumber, email, role } = req.body;
    const admin = req.user;

    // Check if a new image was uploaded
    let newImage = {};
    if (req.file) {
        newImage = {
            data: fs.readFileSync(path.join(__dirname, '../public/adminImage/' + req.file.filename)),
            contentType: 'image/png',
        };
    }

    // Find the existing admin to get the current image
    const existingAdmin = await Admin.findById(mu_id);

    // Retain the existing image or use the new image
    const adminImage = req.file ? newImage : (existingAdmin ? existingAdmin.image : {});

    // Hash the new password
    console.log(password);


      // Check if a new password was provided
    if (password && password !== existingAdmin.password) {
    // Hash the new password
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) {
                console.error(err);
                res.send('Error hashing password');
            } else {
                // Update the document with the hashed password
                try {
                    await Admin.findByIdAndUpdate(mu_id, {
                        $set: {
                            fullName,
                            username,
                            password: hash, // Update with hashed password
                            adminAddress,
                            adminNumber,
                            email,
                            role,
                            image: adminImage, // Use the existing or new image
                            admin,
                        }
                    });

                    req.flash('success_msg', 'Information Successfully Updated');
                    res.redirect('/backend/admin');
                } catch (error) {
                    console.error(error);
                    res.send('Error updating admin');
                }
            }
        });
    });
   } else {
        // Password field is empty or not changed, don't update the password
    try {
        await Admin.findByIdAndUpdate(mu_id, {
            $set: {
                fullName,
                username,
                adminAddress,
                adminNumber,
                email,
                role,
                image: adminImage, // Use the existing or new image
                admin,
            }
        });

        req.flash('success_msg', 'Information Successfully Updated');
        res.redirect('/backend/admin');
       } catch (error) {
        console.error(error);
        res.send('Error updating admin');
       }
   }


});


router.get(`/deleteAdmin/:m_id`, checkAuthenticated, (req, res) => {

    const mid = req.params.m_id;
    Admin.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Admin deleted successfully');
            res.redirect(`/backend/admin`)
        })
        .catch(() => {

            res.send(`error`)
        })
});

                                               //APPOINTMENT SECTIONS
router.post(`/searchAppointment`, checkAuthenticated, async (req, res) => {

    try {
        const admin = req.user; 


        const appointmentInfo = req.body.flname; // Use req.body to get the name from the form input

        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            flname: { $regex: new RegExp(appointmentInfo, 'i') } // 'i' for case-insensitive
        };

        const appointment = await Appointment.find(query);


        res.render('backend/searchAppointment', { appointment,admin });
    } catch (err) {
        console.error(err);
        res.redirect('backend/patient-appoint');
    }

});


router.get(`/backend/patient-appoint`, checkAuthenticated,  async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await Appointment.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

   
    const admin = req.user; 


    const patientAppointment = await Appointment.find().sort({ date: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);

    res.render('backend/patient-appoint', { patientAppointment,admin, totalPages, currentPage: page });


});

router.get(`/backend/viewAppoint/:m_id`, checkAuthenticated, async (req, res) => {
    try {
        const appointmentId = req.params.m_id;

        // Fetch patient appointment details based on the appointmentId
        const appointment = await Appointment.findOne({ _id: appointmentId });

        if (!appointment) {
            return res.status(404).send(`Appointment not found`);
        }
        const admin = req.user; 


        // Render the viewAppoint page with appointment details
        res.render(`backend/viewAppoint`, { appointment, admin });
    } catch (err) {
        console.error(err);
        res.status(500).send(`There's a problem selecting from DB`);
    }
});


router.get(`/backend/appoint-edit/:m_id`, checkAuthenticated,async (req, res) => {

    const admin = req.user; 


    const mv = Appointment.findOne({ _id: req.params.m_id })

        .then((recs) => {

            res.render(`backend/appoint-edit`, { admin,appointment: recs })
        })

        .catch((err) => {

            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/patient-appoint');
            console.log(err);
        })

})


router.post(`/appoint-edit/:mu_id`, checkAuthenticated, (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;

    const { flname, email, department, date, newDate, number, disease , textarea} = req.body;
    const admin = req.user;
    
    Appointment.findByIdAndUpdate(mu_id, { $set: { flname, email, department, date, newDate, number, disease, disease, textarea,admin, } })

        .then(() => {

            // res.send(`Successfully Edited`)
            req.flash(`success_msg`, 'Information Successfully Updated');
            res.redirect('/backend/patient-appoint');


        })
        .catch((err) => {
            console.log(err)
            res.send(`There is issue with your information`)
            res.redirect('/backend/patient-appoint');

        })

    let msg = `Dear` + ' ' + flname + ' ' + `, We hope this message finds you in good health. This is to inform you of a change in your upcoming appointment at Korex Hospital. Please read the following details carefully:\n\n` +

        'Previous Appointment Details: \n' +
        "Full Name: " + flname + "\n" +
        "Department: " + department + "\n" +
        'Appointment Date:' + date + '\n\n' +

        'New Appointment Details:\n' +
        "Full Name: " + flname + "\n" +
        "Email Address: " + email + "\n" +
        "Department: " + department + "\n" +
        "Disease: " + disease + "\n" +
        "New Date: " + newDate + "\n\n" +
        'We understand that changes in appointment schedules can be inconvenient, and we sincerely apologize for any inconvenience this may cause. The change was made to ensure that you receive the best possible care during your visit to our hospital.\n\n' +

        'If the new appointment date and time are suitable for you, there is no need to take any action. Your updated appointment details have been automatically updated in our system.\n\n' +

        "However, if the new appointment date and time do not work for you or if you have any questions or concerns regarding this change, please do not hesitate to contact our appointment scheduling department at +2347033731378 or ibrahim4grace@gmail.com.\n\n" +

        'Please arrive at the hospital on time for your new appointment, and remember to bring any necessary documents or medical records with you.\n\n' +

        'Once again, we apologize for any inconvenience caused by this change and appreciate your understanding. We remain committed to providing you with the best possible healthcare services.\n\n' +

        "Once again, thank you for choosing Korex Hospital. We are committed to providing you with the highest quality healthcare services and support.\n\n" +
        "Best regards,\n" +
        "Korex Hospital";

    const mailOptions = {
        from: 'ibro4grace@gmail.com',
        to: email,
        subject: 'Confirmation of Appointment Change',
        text: msg,


    };


    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Email sending error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });


})

router.get(`/appoint_delete/:mu_id`, checkAuthenticated,  (req, res) => {


    const del = req.params.mu_id;
    Appointment.findByIdAndDelete(del)

        .then(() => {
            req.flash(`success_msg`, 'Appointment deleted successfully');
            res.redirect('/backend/patient-appoint');
        })
        .catch(() => {

            res.send(`Data deleted successfully`)
        })
});


                           //DOCTOR SECTIONS
router.get('/backend/add-doctor', checkAuthenticated, (req, res) => {

    const admin = req.user; 
    
    res.render('backend/add-doctor', {  admin});
   
});
                            

   //DOCTOR IMAGE FOLDER
let storge = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/doctorImage/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now())
    }
});
const upload = multer({ storage: storge });

router.post(`/add-doctor`, checkAuthenticated, upload.single('image'), async (req, res) => {
    const { flname, email, number, gender, specialty, dob, address, username, password, password2, facebook, twitter, linkedin, employeDate } = req.body;
    const admin = req.user;
    let errors = [];

    if (!flname || !email || !number || !gender || !specialty || !dob || !address || !username || !password || !password2 || !employeDate) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Password does not match' });
    }

    if (!password || password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    try {
        const doctorWithEmail = await Doctors.findOne({ email: email });
        if (doctorWithEmail) {
            errors.push({ msg: 'Email already registered' });
        }

        const doctorWithUsername = await Doctors.findOne({ username: username });
        if (doctorWithUsername) {
            errors.push({ msg: 'Username already registered' });
        }

        if (errors.length > 0) {
            return res.render('backend/add-doctor', {
                errors,
                flname,
                email,
                number,
                gender,
                specialty,
                dob,
                address,
                username,
                password,
                password2,
                employeDate,
                admin,
            });
        }

        const hash = await bcrypt.hash(password, 10);
        
        const newDoctor = new Doctors({
            flname,
            email,
            number,
            gender,
            specialty,
            dob,
            address,
            username,
            password: hash,
            facebook,
            twitter,
            linkedin,
            employeDate,
            image: {
                data: fs.readFileSync(path.join(__dirname, '../public/doctorImage/' + req.file.filename)),
                contentType: 'image/png',
            },
            admin,
        });

        await newDoctor.save();

        // Your email sending code here
        let msg =
        'Dear ' + flname + ",  We are thrilled to welcome you to the medical team at Korex Hospital. Your expertise and dedication to patient care make you a valuable addition to our hospital family.\n\n" +

        'Here are some important details to get you started:\n\n' +
        "Full Name: " + flname + "\n" +
        "Specialty: " + specialty + "\n" +
        "Phone Number: " + number + "\n" +
        "Address : " + address + "\n" +
        'Hospital Address: 6 Ojuelesgba RD off Akinde Estate Lagos' + '\n\n' +

        " Your commitment to healthcare excellence aligns perfectly with our hospital's mission to provide the highest quality of care to our patients. We are confident that your skills and compassionate care will make a significant difference in the lives of our patients.. If you have any changes or need to reschedule, please contact us at least 24 hours in advance. We look forward to providing you with excellent healthcare services. If you have any questions or need further assistance, feel free to reach out to our customer service team. Thank you for choosing Korex Hospital for your medical needs.\n\n" +

        " If you have any questions or require any assistance as you settle in, please feel free to reach out to our HR department at 2347033731378 or ibrahim4grace@gmail.com \n\n" +

        " Once again, welcome to Korex Hospital. We look forward to working together to continue delivering exceptional healthcare services to our community.";

        const mailOptions = {
        from: 'ibro4grace@gmail.com',
        to: email,
        subject: 'Welcome to Korex Hospital',
        text: msg,

     };

       transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Email sending error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
      });

        req.flash('success_msg', 'Doctor Successfully Registered');
        res.redirect('/backend/all-doctor');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while processing your request.');
        res.redirect('/backend/add-doctor');
    }
});


                       //ALL DOCTORS

router.get('/backend/all-doctor', checkAuthenticated, async (req, res) => {
   
        const admin = req.user;
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPosts = await Doctors.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);


        const myDoctor = await Doctors.find()
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/all-doctor', { myDoctor, admin, totalPages, currentPage: page });
   
});


router.post(`/searchDoctor`, checkAuthenticated, async (req, res) => {

    try {
        const admin = req.user; 
        const searchDoc = req.body.flname; // Use req.body to get the name from the form input

        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            flname: { $regex: new RegExp(searchDoc, 'i') } // 'i' for case-insensitive
        };

        const doctorName = await Doctors.find(query);

        res.render('backend/searchDoctor', { doctorName,admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/all-doctor');
    }

});

router.get(`/backend/doctorProfile/:mu_id`, checkAuthenticated, async (req, res) => {
    try {
        const profileId = req.params.mu_id;

        // Fetch patient appointment details based on the appointmentId
        const doctorInformation = await Doctors.findOne({ _id: profileId });

        if (!doctorInformation) {
            return res.status(404).send(`Appointment not found`);
        }
        const admin = req.user; 


        // Render the viewAppoint page with appointment details
        res.render(`backend/doctorProfile`, { doctorInformation, admin });
    } catch (err) {
        console.error(err);
        res.status(500).send(`There's a problem selecting from DB`);
    }
})



router.get(`/backend/edit-doctor/:mu_id`, checkAuthenticated, (req, res) => {
    const admin = req.user;
    const mv = Doctors.findOne({ _id: req.params.mu_id })

        .then((recs) => {

            res.render(`backend/edit-doctor`, { doctor: recs, admin })
        })

        .catch((err) => {

            res.send(`There's a problem selecting from DB`);
            console.log(err);
        })
})



router.post(`/edit-doctor/:mu_id`, checkAuthenticated, upload.single('image'), async (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;

    const { flname, email, number, gender, specialty, dob, address, username, password, facebook, twitter, linkedin, employeDate } = req.body;
    const admin = req.user;

    // Check if a new image was uploaded
    let newImage = {};
    if (req.file) {
        newImage = {
            data: fs.readFileSync(path.join(__dirname, '../public/doctorImage/' + req.file.filename)),
            contentType: 'image/png',
        };
    }

    // Find the existing admin to get the current image
    const existingDoctor = await Doctors.findById(mu_id);

    // Retain the existing image or use the new image
    const doctorImage = req.file ? newImage : (existingDoctor ? existingDoctor.image : {});

    // Hash the new password
    console.log(password);


      // Check if a new password was provided
    if (password && password !== existingDoctor.password) {
    // Hash the new password
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) {
                console.error(err);
                res.send('Error hashing password');
            } else {
                // Update the document with the hashed password
                try {
                    await Doctors.findByIdAndUpdate(mu_id, {
                        $set: {
                            flname,
                            email,
                            number,
                            gender,
                            specialty,
                            dob,
                            address,
                            username,
                            password,
                            facebook,
                            twitter,
                            linkedin,
                            employeDate,
                            image: doctorImage,
                            admin,
                        }
                    });
                    
                    let msg = 'Dear ' + flname + `,\n\n` +

                    `We hope this message finds you well.\n\n` +

                    'We wanted to inform you that there has been an update to your information in our database. The details that have been modified include:\n\n' +

                    'New Information:\n' +
                    "Name: " + flname + "\n" +
                    "Email: " + email + "\n" +
                    "Phone Number: " + number + "\n" +
                    "Specialty: " + specialty + "\n" +
                    "username: " + username + "\n" +
                    "Address: " + address + "\n" +
                    "Facebook ID: " + facebook + "\n" +
                    "Twitter ID: " + twitter + "\n" +
                    "LinkedIN ID: " + linkedin + "\n\n" +

                    "Please review the changes to ensure that they accurately reflect your information. If you believe any information is incorrect or if you have any questions regarding the update, please don't hesitate to reach out to our administrative team at +2347033731378 or ibrahim4grace@gmail.com..\n\n" +

                    "We value your continued association with us, and it's important to us that your records are kept up-to-date for your convenience and our records..\n\n" +

                    "Thank you for your prompt attention to this matter. We appreciate your trust in our services and are here to assist you with any further inquiries you may have..\n\n" +

                    "warm regards,\n" +
                    "Korex Hospital";
                            

                    const mailOptions = {
                        from: 'ibro4grace@gmail.com',
                        to: email,
                        subject: 'Information Update Confirmation',
                        text: msg,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log('Email sending error:', error);
                        } else {
                            console.log('Email sent:', info.response);
                        }
                    });


                    req.flash('success_msg', 'Doctor Information Successfully Updated');
                    res.redirect('/backend/all-doctor');
                } catch (error) {
                    console.error(error);
                    res.send('Error updating doctor');
                }
            }
        });
    });
   } else {
        // Password field is empty or not changed, don't update the password
    try {
        await Doctors.findByIdAndUpdate(mu_id, {
            $set: {
                            flname,
                            email,
                            number,
                            gender,
                            specialty,
                            dob,
                            address,
                            username,
                            facebook,
                            twitter,
                            linkedin,
                            employeDate,
                            image: doctorImage,
                            admin,
            }
        });

                         let msg = 'Dear ' + flname + `,\n\n` +

                         `We hope this message finds you well.\n\n` +

                         'We wanted to inform you that there has been an update to your information in our database. The details that have been modified include:\n\n' +

                         'New Information:\n' +
                         "Name: " + flname + "\n" +
                         "Email: " + email + "\n" +
                         "Phone Number: " + number + "\n" +
                         "Specialty: " + specialty + "\n" +
                         "username: " + username + "\n" +
                         "Address: " + address + "\n" +
                         "Facebook ID: " + facebook + "\n" +
                         "Twitter ID: " + twitter + "\n" +
                         "LinkedIN ID: " + linkedin + "\n\n" +

                         "Please review the changes to ensure that they accurately reflect your information. If you believe any information is incorrect or if you have any questions regarding the update, please don't hesitate to reach out to our administrative team at +2347033731378 or ibrahim4grace@gmail.com..\n\n" +

                         "We value your continued association with us, and it's important to us that your records are kept up-to-date for your convenience and our records..\n\n" +

                         "Thank you for your prompt attention to this matter. We appreciate your trust in our services and are here to assist you with any further inquiries you may have..\n\n" +

                         "warm regards,\n" +
                         "Korex Hospital";
                

                         const mailOptions = {
                            from: 'ibro4grace@gmail.com',
                            to: email,
                            subject: 'Information Update Confirmation',
                            text: msg,
                        };

                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                console.log('Email sending error:', error);
                            } else {
                                console.log('Email sent:', info.response);
                            }
                        });


        req.flash('success_msg', 'Doctor Information Successfully Updated');
        res.redirect('/backend/all-doctor');
       } catch (error) {
        console.error(error);
        res.send('Error updating doctor');
       }
   }


});


router.get(`/delete_doctor/:mu_id`, checkAuthenticated, (req, res) => {

    const id = req.params.mu_id;
    Doctors.findByIdAndDelete(id)

        .then(() => {
            req.flash(`success_msg`, 'Doctor deleted successfully');
            res.redirect(`/backend/all-doctor`)
        })
        .catch(() => {

            res.send(`Error`)
            res.redirect(`/backend/add-doctor`)
        })
});

                           //PATIENTS SECTION
router.get(`/backend/addPatient`, checkAuthenticated, async (req, res) => {
  
        const admin = req.user;
        
        res.render('backend/addPatient', {  admin });
    
});

// Function to generate a unique patient ID
function generatePatientID() {
    // Your logic to generate a unique patient ID here
    const prefix = 'PT';
    const uniqueNumber = generateUniqueNumber();
    const newPatientID = `${prefix}${uniqueNumber}`;
    return newPatientID;
}

// Function to generate a unique number
function generateUniqueNumber() {
    // Your logic to generate a unique number here
    return Math.floor(1000 + Math.random() * 9000);
}

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

router.post(`/addPatient`, checkAuthenticated, upl.single('image'), async (req, res) => {
    
    const { name, email, gender, dob, number, address, password, password2, occupation,diagnosis,treatment,bloodGroup } = req.body;
    const admin = req.user;
    let errors = [];

    //check required fields
    if (!name || !email || !gender || !dob || !number || !address || !password || !password2 ||!occupation  ||!bloodGroup) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    //check passwords match
    if (password !== password2) {
        errors.push({ msg: 'Password do not match' });
    }

    // Generate a new unique patient ID
    let newPatientID;
    let isUnique = false;
    while (!isUnique) {
        newPatientID = generatePatientID();
        // Check if the generated patient ID already exists
        const patientIDExists = await User.findOne({ patientID: newPatientID });
        if (!patientIDExists) {
            isUnique = true;
        }
    }

    //Check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    //if all check complet
    if (errors.length > 0) {
        res.render('backend/addPatient', {
            errors,
            name,
            email,
            gender,
            dob,
            number,
            address,
            password,
            password2,
            occupation,
            bloodGroup,
            admin,
            
        });

    } else {

        try {
            // Check if the email is already registered in the notRegister table
            const notRegisteredUserExists = await notRegistered.findOne({ email });

            if (notRegisteredUserExists) {
                errors.push({ msg: 'Email already registered' });

                // Render the registration page with errors
                res.render('backend/addPatient', {
                    errors,
                    name,
                    email,
                    gender,
                    dob,
                    number,
                    address,
                    password,
                    password2,
                    occupation,
                    bloodGroup,
                    admin,
                });
            } else {
                // Check if the email is already registered in the User table
                const registeredUserExists = await User.findOne({ email });

                if (registeredUserExists) {
                    errors.push({ msg: 'Email already registered' });

                    // Render the registration page with errors
                    res.render('backend/addPatient', {
                        errors,
                        name,
                        email,
                        gender,
                        dob,
                        number,
                        address,
                        password,
                        password2,
                        occupation,
                        bloodGroup,
                        admin,
                    });
                } else {
                    // Hash the password
                    const hashedPassword = await bcrypt.hash(password, 10);

                     // Generate a new patient ID
                    const newPatientID = generatePatientID(); // Use generatePatientID here

                    const newUser = new User({
                    name,
                    email,
                    gender,
                    dob,
                    number,
                    address,
                    password:hashedPassword,
                    occupation,
                    diagnosis,
                    treatment,
                    bloodGroup,
                    patientID: newPatientID, // Assign the generated patient ID
                    image: {
                        data: fs.readFileSync(path.join(__dirname, '../public/patientImage/' + req.file.filename)),
                        contentType: 'image/png'
                    },
                    admin,
                    
                });

                    // Save the user to the notRegister table
                    await newUser.save();
                    let msg =
                    'Dear ' + name + ",  We are delighted to welcome you to Korex Hospital! Thank you for choosing us as your healthcare provider. We are committed to providing you with the highest quality medical care and ensuring your well-being..\n\n" +

                    "Your registration with us is now complete, and your patient account is active. Here are some important details:\n\n" +

                    'Here are some important details to get you started:\n\n' +
                    "Full Name: " + name + "\n" +
                    "Date of Birth: " + dob + "\n" +
                    "Phone Number: " + number + "\n" +
                    "Home Address: " + address + "\n" +
                    "Occupation: " + occupation + "\n" +
                    "Diagnosis: " + diagnosis + "\n" +
                    "Blood Group: " + bloodGroup + "\n" +
                    'Email Address:' + email + '\n\n' +

                    "Medical Appointments: You can now schedule medical appointments with our healthcare professionals. Our team is dedicated to providing you with personalized care and addressing your healthcare needs..\n\n" +

                    " If you have any questions or require any assistance as you settle in, please feel free to reach out to our HR department at 2347033731378 or ibrahim4grace@gmail.com \n\n" +

                    " Once again, welcome to Korex Hospital. We look forward to serving your healthcare needs and ensuring your health and well-being. We are here for you every step of the way.";

                const mailOptions = {
                    from: 'ibro4grace@gmail.com',
                    to: email,
                    subject: 'Welcome to Korex Hospital Account Confirmation',
                    text: msg,

                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Email sending error:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });

                // console.log(newUser)
                req.flash('success_msg', 'Patient successfully registered.');
                res.redirect('/backend/allpatients');
                }
            }
        } catch (error) {
           // Handle any unexpected errors
        console.error('Registration error:', error);
        // Render an error page or send an error response
        res.status(500).send('Internal Server Error');
        }
        
    }
});

                               // REGISTERED PATIENTS

router.get(`/backend/allpatients`, checkAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 8; // Number of items per page
        const totalPosts = await User.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const admin = req.user;

        const myPatient = await User.find()
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/allpatients', { myPatient,admin, totalPages, currentPage: page });
    } catch (error) {
        // Handle any errors, e.g., by sending an error response
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

                                   //SEARCH pATIENT
router.post(`/searchPatient`,checkAuthenticated, async (req, res) => {
    try {
        const patientName = req.body.name; // Use req.body to get the name from the form input

        // Use a regular expression to perform a case-insensitive search for the patient's name
        const query = {
            name: { $regex: new RegExp(patientName, 'i') } // 'i' for case-insensitive
        };

        const admin = req.user;
        const users = await User.find(query);


        res.render('backend/searchPatient', { users,admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/allpatients');
    }
});

                           //VIEW REGISTERED PATIENT PROFILE
router.get(`/backend/viewPatient/:m_id`, checkAuthenticated, async (req, res) => {
    try {
        const patienttId = req.params.m_id;

        // Fetch patient appointment details based on the appointmentId
        const ourPatient = await User.findOne({ _id: patienttId });

        if (!ourPatient) {
            return res.status(404).send(`Appointment not found`);
        }
        const admin = req.user; 

         // Query the MedicalRecord collection for records associated with the user
         const medicalRecords = await MedicalRecord.find({ user_id: patienttId });


        // Render the viewAppoint page with appointment details
        res.render(`backend/viewPatient`, { ourPatient, admin, medicalRecords });
    } catch (err) {
        console.error(err);
        res.status(500).send(`There's a problem selecting from DB`);
    }
});

                 // ADD PATIENT MEDICAL RECORD 
router.get(`/backend/addmedicalrecord/:m_id`, checkAuthenticated, (req, res) => {
    const userId = req.params.m_id; // Assuming this is the user's ObjectID
    const admin = req.user; 
    User.findById(userId)
        .then((user) => {
            res.render(`backend/addmedicalrecord`, { user,admin });
        })
        .catch((err) => {
            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/allpatients');
            console.log(err);
        });
});

// Handle the form submission to add a new medical record
router.post('/addmedicalrecord/:m_id',checkAuthenticated, async (req, res) => {
    const admin = req.user;
    const userId = req.params.m_id;
    const { diagnosis, treatment, date } = req.body;


    const user = await User.findOne({ _id: userId });

    if (!user) {
        // Handle the case where the user is not found
        return res.redirect('/backend/allpatients');
    } else {

        // Create a new medical record
        const newMedicalRecord = new MedicalRecord({
            diagnosis,
            treatment,
            user_id: userId,
            date,
            admin
        });

        try {
            await newMedicalRecord.save();
            req.flash(`success_msg`, 'Record successfully Saved');
            res.redirect(`/backend/allpatients`)
        }

        catch (err) {
            // Handle any errors that occur during the process
            console.error(err);
            return res.redirect('/backend/allpatients'); // Redirect to an error page
        }

    }
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

