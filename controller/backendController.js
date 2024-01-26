const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const passport = require('passport');

const User = require('../models/User');
const Admin = require('../models/admin');
const { Doctors, DoctorPayment } = require('../models/doctors');
const { Appointment, Contact } = require('../models/appointment');
const notRegistered = require('../models/unregis_patient');
const MedicalRecord = require('../models/addmedicalrecord');
const    { HospitalExpenses, PatientPayment }  = require('../models/patientPayment');

// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: process.env.MAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});

// Passport config
const initializePassport = require('../config/passport');

initializePassport(passport, async (username) => {
    try {
        const admin = await Admin.find({ username: username });
        return admin;
    } catch (error) {
        // Handle any errors here
        console.error(error);
        return null;
    }
});



//admin login 
const adminloginPage = (req, res) => {
    res.render('backend/adminlogin');
};

const adminloginPagePost = (req, res, next) => {
    passport.authenticate('local-admin', {
        successRedirect: '/backend/dashboard',
        failureRedirect: '/backend/adminlogin',
        failureFlash: true,
    })(req, res, next);
};

//Welcome admin dashboard
const adminDashboard = async (req, res) => {
    // Access the authenticated admin user
    const admin = req.user;

    //pagination
    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await Appointment.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);


    const appointment = await Appointment.find()
         .sort({ date_added: -1 }) // Sort by
        .skip((page - 1) * perPage)
        .limit(perPage);


    res.render('backend/dashboard', { appointment, admin, totalPages, currentPage: page });
};

//ADMIN SECTIONS
const adminSection = async (req, res) => {
    const admin = req.user;

    const page = parseInt(req.query.page) || 1;
    const perPage = 5; // Number of items per page
    const totalPosts = await Admin.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const adminResults = await Admin.find().sort({ date: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
    res.render('backend/admin', { adminResults, admin, totalPages, currentPage: page });
};

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

const addNewAdminPost = async (req, res) => {

    const { adminFullName, adminUsername, adminPassword, adminPassword2, adminEmail, adminNumber, adminAddress, adminCity, adminState, adminRole, adminDob, adminEmergencyName, adminEmergencyNumber, adminEmployDate } = req.body;
    const admin = req.user;
    let errors = [];

    //check required fields
    if (!adminFullName || !adminUsername || !adminPassword || !adminPassword2 || !adminEmail || !adminNumber || !adminAddress || !adminCity || !adminState || !adminRole || !adminDob || !adminEmergencyName || !adminEmergencyNumber || !adminEmployDate) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    //check passwords match
    if (adminPassword !== adminPassword2) { errors.push({ msg: 'Password do not match' }); }

    //Check password length
    if (adminPassword.length < 6) { errors.push({ msg: 'Password should be at least 6 characters' }); }

    //if all check complete
    if (errors.length > 0) {
        return res.render('backend/admin', {
            errors,
            adminFullName,
            adminUsername,
            adminPassword,
            adminPassword2,
            adminAddress,
            adminNumber,
            adminEmail,
            adminRole,
            admin,
        });
    }

    try {

        const userExists = await User.findOne({ $or: [{ email: adminEmail }, { username: adminUsername }]});
        if (userExists) {
            // Either email or username is already registered
            if (userExists.email === adminEmail) {
                errors.push({ msg: 'Email already registered' });
            }
            if (userExists.username === adminUsername) {
                errors.push({ msg: 'Username already registered' });
            }
        }
    
        const adminExists = await Admin.findOne({ $or: [{ adminEmail: adminEmail }, { adminUsername: adminUsername }] });
        if (adminExists) {
            // Either email or username is already registered
            if (adminExists.adminEmail === adminEmail) {
              errors.push({ msg: 'Email already registered' });
            }
            if (adminExists.adminUsername === adminUsername) {
              errors.push({ msg: 'Username already registered' });
            }
          }

        const hash = await bcrypt.hash(adminPassword, 10);

        const newAdmin = new Admin({
            adminFullName,
            adminUsername,
            adminPassword: hash,
            adminEmail,
            adminNumber,
            adminAddress,
            adminCity,
            adminState,
            adminRole,
            adminDob,
            adminEmergencyName,
            adminEmergencyNumber,
            adminEmployDate,
            image: {
                data: fs.readFileSync(path.join(__dirname, '../public/adminImage/' + req.file.filename)),
                contentType: 'image/png'
            },
            admin,
        });

        await newAdmin.save();
        // Your email sending code here
        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
            <p>Dear   ${adminFullName} ,   We are thrilled to welcome you to Korex hospital Service. Your expertise and dedication to patient care make you a valuable addition to our hospital. </p>

            <p>Here are some important details to get you started:</p>
            <ul>
                <li>Full Name: ${adminFullName}</li>
                <li>Username: ${adminUsername}</li>
                <li>Phone Number: ${adminNumber}</li>
                <li>Email: ${adminEmail}</li>
                <li>Address: ${adminAddress}</li>
                <li>City: ${adminCity}</li>
                <li>State: ${adminState}</li>
                <li>Role: ${adminRole}</li>
                <li>Emergency Name: ${adminEmergencyName}</li>
                <li>Emergency Number : ${adminEmergencyNumber}</li>
            </ul>

            <p>We are delighted to welcome you to our platform.</p>

            <p>If you have any questions or need assistance, feel free to reach out to our support team at support@korexlogistic.com</p>

            <p>Thank you for your prompt attention to this matter. We appreciate your trust in our services and we are here to assist you with any further inquiries you may have..</p>

            <p>Best regards,<br>
            The Korex Logistic Team</p>`;

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: adminEmail,
            subject: 'Welcome to Korex Logistic Company!',
            html: msg,
            attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email sending error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        req.flash('success_msg', 'Dear ' + adminFullName + ', Your account has been successfully created.');
        res.redirect('/backend/admin');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while processing your request.');
        res.redirect('/backend/dashboard');
    }
};

//EDIT ADMIN SECTIONS
const editAdmininformation = async (req, res) => {
    const admin = req.user;
    const prop = Admin.findOne({ _id: req.params.m_id })
        .then((recs) => {
            res.render(`backend/editAdmin`, { admin, adminResults: recs })
        })
        .catch((err) => {
            res.send(`There's a problem selecting from DB`);
            res.redirect('/backend/admin');
            console.log(err);
        })
};

const editAdmininformationPost = async (req, res) => {
    try {
        const admin = req.user;
        let errors = [];
        const mu_id = req.params.mu_id;

        const { adminFullName, adminUsername, adminPassword, adminEmail, adminNumber, adminAddress, adminCity, adminState, adminRole, adminDob, adminEmergencyName, adminEmergencyNumber } = req.body;

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

        // Hash the new password if it has been changed
        let adminPasswordHash;
        if (adminPassword && adminPassword !== existingAdmin.adminPassword) {
            adminPasswordHash = bcrypt.hashSync(adminPassword, 10);
        } else {
            // If the password hasn't changed, retain the existing hashed password
            adminPasswordHash = existingAdmin.adminPassword;
        }

        // Update the document with the hashed password
        await Admin.findByIdAndUpdate(mu_id, {
            $set: {
                adminFullName,
                adminUsername,
                adminPassword: adminPasswordHash, // Update the password only if it has changed
                adminEmail,
                adminNumber,
                adminAddress,
                adminCity,
                adminState,
                adminRole,
                adminDob,
                adminEmergencyName,
                adminEmergencyNumber,
                image: adminImage, // Use the existing or new image
                admin,
            }
        });

        let phoneNumber = process.env.HOSPITAL_Number;
        let emailAddress = process.env.HOSPITAL_EMAIL;



        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${adminFullName}, We wanted to inform you that there has been an update to your information in our database. The details that have been modified include:</p>

        <p>New Information:</p>
        <ul>
            <li>Full Name: ${adminFullName}</li>
            <li>Username: ${adminUsername}</li>
            <li>Email Address: ${adminEmail}</li>
            <li>Phone Number: ${adminNumber}</li>
            <li>Home Address: ${adminAddress}</li>
            <li>City: ${adminCity}</li>
            <li>State: ${adminState}</li>
            <li>Role: ${adminRole}</li>
            <li>Emergency Name : ${adminEmergencyName}</li>
            <li>Emergency Number : ${adminEmergencyNumber}</li>
        </ul>

        <p>Please review the changes to ensure that they accurately reflect your information. If you believe any information is incorrect or if you have any questions regarding the update, please don't hesitate to reach out to our administrative team at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>.</p>

        <p>We value your continued association with us, and it's important to us that your records are kept up-to-date for your convenience and our records.</p>

        <p>Thank you for your prompt attention to this matter. We appreciate your trust in our services and are here to assist you with any further inquiries you may have.</p>

        <p>Best regards,<br>
        The Korex Hospital Team</p>`;


        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: adminEmail,
            subject: 'Information Update Confirmation',
            html: msg,
            attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email sending error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
        req.flash('success_msg', 'Dear ' + adminFullName + ', Your Information Successfully Updated');
        res.redirect('/backend/admin');
    } catch (error) {
        console.error('Error updating admin:', error);
        req.flash('error_msg', 'An error occurred while updating admin information.');
        res.redirect('/backend/dashboard/' + mu_id); // Redirect to the edit page with an error message
    }

};

const deleteAdminProfile = (req, res) => {
    const mu_id = req.params.mu_id;
    Admin.findByIdAndDelete(mu_id)
    .then(() => {
        req.flash(`success_msg`, 'Admin deleted successfully');
        res.redirect(`/backend/Admin`)
    })
    .catch((error) => {
        console.error('Error deleting admin:', error);
        req.flash('error_msg', 'Error deleting admin');
        res.redirect('/backend/dashboard');
    })

};

//APPOINTMENT SECTIONS
const appointmentSection = async (req, res) => {
    const admin = req.user;
    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await Appointment.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const patientAppointment = await Appointment.find()
        .sort({ date_added: -1 }) // Sort by
        .skip((page - 1) * perPage)
        .limit(perPage);

    res.render('backend/patientAppointment', { patientAppointment, admin, totalPages, currentPage: page });
};

const searchAppointment = async (req, res) => {
    try {
        const admin = req.user;
        // Use req.body to get the name from the form input
        const appointmentInfo = req.body.flname; 
        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            flname: { $regex: new RegExp(appointmentInfo, 'i') } // 'i' for case-insensitive
        };
        const appointment = await Appointment.find(query);
        res.render('backend/searchAppointment', { appointment, admin });
    } catch (err) {
        console.error(err);
        res.redirect('backend/patientAppointment');
    } 
};

const viewAppointment = async (req, res) => {
    try {
        const admin = req.user;
        const appointmentId = req.params.m_id;
        // Fetch patient appointment details based on the appointmentId
        const appointment = await Appointment.findOne({ _id: appointmentId });

        if (!appointment) {
            return res.status(404).send(`Appointment not found`);
        }
        // Render the viewAppoint page with appointment details
        res.render(`backend/viewAppoint`, { appointment, admin });
    } catch (err) {
        console.error(err);
        res.status(500).send(`There's a problem selecting from DB`);
    }
};

const editAppointment = async (req, res) => {
    const admin = req.user;
    const mv = Appointment.findOne({ _id: req.params.m_id })
    .then((recs) => {

        res.render(`backend/appoint-edit`, { admin, appointment: recs })
    })
    .catch((err) => {
        res.send(`There's a problem selecting from DB`);
        res.redirect('/backend/patient-appoint');
        console.log(err);
    })
};

const editAppointmentPost = async (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;

    const { flname, email, department, date, newDate, number, disease, textarea } = req.body;
    const admin = req.user;

    try {
        // Use await to wait for the promise to resolve
        await Appointment.findByIdAndUpdate(mu_id, { $set: { flname, email, department, date, newDate, number, disease, disease, textarea, admin, } });

        let phoneNumber = process.env.HOSPITAL_Number;
        let emailAddress = process.env.HOSPITAL_EMAIL;

        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${flname}, We hope this message finds you in good health. This is to inform you of a change in your upcoming appointment at Korex Hospital. Please read the following details carefully:</p>
    
        <p>Previous Appointment Details:</p>
        <ul>
            <li>Full Name: ${flname}</li>
            <li>Department: ${department}</li>
            <li>Appointment Old Date: ${date}</li>
        </ul>
    
         <p>New Appointment Details:</p>
    
        <ul>
            <li>Full Name: ${flname}</li>
            <li>Email: ${email}</li>
            <li>Department: ${department}</li>
            <li>Disease: ${disease}</li>
            <li>New Appointment Date: ${newDate}</li>
        </ul>
        
        <p>We understand that changes in appointment schedules can be inconvenient, and we sincerely apologize for any inconvenience this   may cause. The change was made to ensure that you receive the best possible care during your visit to our hospital</p>
        
        <p>If the new appointment date and time are suitable for you, there is no need to take any action. Your updated appointment details have been automatically updated in our system</p>
    
        <p>However, if the new appointment date and time do not work for you or if you have any questions or concerns regarding this change, please do not hesitate to contact our appointment scheduling department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>.</p>
    
        <p>Please arrive at the hospital on time for your new appointment, and remember to bring any necessary documents or medical records with you.</p>
    
        <p>Once again, we apologize for any inconvenience caused by this change and appreciate your understanding. We remain committed to providing you with the best possible healthcare services.</p>
    
        <p>Best regards,<br>
        The Korex Hospital Team</p>`;

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Appointment Update Confirmation',
            html: msg,
            attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email sending error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });  

        // Success message
        req.flash('success_msg', 'Information Successfully Updated');
        res.redirect('/backend/patientAppointment');
    } catch (err) {
        // Handle errors
        console.log(err);
        req.flash('error_msg', 'There is an issue with your information');
        res.redirect('/backend/patientAppointment');
    }
};

const deleteAppointment = (req, res) => {
    const del = req.params.mu_id;
    Appointment.findByIdAndDelete(del)
    .then(() => {
        req.flash(`success_msg`, 'Appointment deleted successfully');
        res.redirect('/backend/patient-appoint');
    })
    .catch(() => {
    res.send(`Data deleted successfully`)
    })
};

//DOCTOR SECTIONS
const addDoctor = (req, res) => {
    const admin = req.user;
    res.render('backend/addDoctor', { admin });
};

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

const addDoctorPost = async (req, res) => {
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
        const doctorExists = await Doctors.findOne({ $or: [{ email: email }, { username: username }] });

        if (doctorExists) {
            // Either email or username is already registered
            if (doctorExists.email === email) {
                errors.push({ msg: 'Email already registered' });
            }
            if (doctorExists.username === username) {
                errors.push({ msg: 'Username already registered' });
            }
        } else {
            if (errors.length > 0) {
                return res.render('backend/addDoctor', {
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
            let phoneNumber = process.env.HOSPITAL_Number;
            let emailAddress = process.env.HOSPITAL_EMAIL;
            let hospitalAddress = process.env.HOSPITAL_ADDRESS;

            let msg = `
            <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${flname}, We are thrilled to welcome you to the medical team at Korex Hospital. Your expertise and dedication to patient care make you a valuable addition to our hospital family:</p>
        
        <ul>
            <li>Full Name: ${flname}</li>
            <li>Specialty: ${specialty}</li>
            <li>Phone Number: ${number}</li>
            <li>Address: ${address}</li>
            <li>Hospital Address : ${hospitalAddress}</li>
        </ul>
        
        <p>Your commitment to healthcare excellence aligns perfectly with our hospital's mission to provide the highest quality of care to our patients. We are confident that your skills and compassionate care will make a significant difference in the lives of our patients.</p> 
        
        <p>If you have any changes or need to reschedule, please contact us at least 24 hours in advance. We look forward to providing you with excellent healthcare services. If you have any questions or need further assistance, feel free to reach out to our customer service team. Thank you for choosing Korex Hospital for your medical needs.</p>
        
        <p>If you have any questions or require any assistance as you settle in, please feel free to reach out to our HR department  at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>.</p>
        
        <p>Once again, welcome to Korex Hospital. We look forward to working together to continue delivering exceptional healthcare services to our community.</p>
        
        <p>Best regards,<br>
        The Korex Hospital Team</p>`;

            const mailOptions = {
                from: process.env.NODEMAILER_EMAIL,
                to: email,
                subject: 'Welcome to Korex Hospital',
                html: msg,
                attachments: [
                    {
                        filename: 'Creat.jpg',
                        path: './public/assets/img/Creat.jpg',
                        cid: 'Creat'
                    }
                ]
            };

            await transporter.sendMail(mailOptions);

            req.flash('success_msg', 'Doctor Successfully Registered');
            res.redirect('/backend/allDoctor');
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while processing your request.');
        res.redirect('/backend/addDoctor');
    }
};

//ALL DOCTORS
const allDoctor = async (req, res) => {
    const admin = req.user;
    const page = parseInt(req.query.page) || 1;
    const perPage = 6;
    const totalPosts = await Doctors.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const myDoctor = await Doctors.find()
        .sort({ date_added: -1 }) // Sort by date_added in descending order
        .skip((page - 1) * perPage)
        .limit(perPage);

       
    res.render('backend/allDoctor', { myDoctor, admin, totalPages, currentPage: page });
};

const searchDoctor = async (req, res) => {
    try {
        const admin = req.user;
        // Use req.body to get the name from the form input
        const searchDoc = req.body.flname; 
        // Use a regular expression to perform a case-insensitive search for the doctor's name
        const query = {
            flname: { $regex: new RegExp(searchDoc, 'i') } // 'i' for case-insensitive
        };
        const doctorName = await Doctors.find(query);
        res.render('backend/searchDoctor', { doctorName, admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/allDoctor');
    }
};

const doctorProfile = async (req, res) => {
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
};

const editDoctor = async (req, res) => {
    const admin = req.user;
    const mv = Doctors.findOne({ _id: req.params.mu_id })
    .then((recs) => {
        res.render(`backend/edit-doctor`, { doctor: recs, admin })
    })
    .catch((err) => {
         res.send(`There's a problem selecting from DB`);
        console.log(err);
    })
};

const editDoctorProfilePost = async (req, res) => {
    
    try {
        const admin = req.user;
        let errors = [];
        const mu_id = req.params.mu_id;

        const { flname, email, number, gender, specialty, dob, address, username, password, facebook, twitter, linkedin, employeDate } = req.body;

        // Check if a new image was uploaded
        let newImage = {};
        if (req.file) {
            newImage = {
                data: fs.readFileSync(path.join(__dirname, '../public/doctorImage/' + req.file.filename)),
                contentType: 'image/png',
            };
        }

        // Find the existing Doctor to get the current image
        const existingDoctor = await Doctors.findById(mu_id);

        // Retain the existing image or use the new image
        const doctorImage = req.file ? newImage : (existingDoctor ? existingDoctor.image : {});

        // Hash the new password if it has been changed
        let passwordHash;
        if (password && password !== existingDoctor.password) {
            passwordHash = bcrypt.hashSync(password, 10);
        } else {
            // If the password hasn't changed, retain the existing hashed password
            passwordHash = existingDoctor.password;
        }

        // Update the document with the hashed password
        await Admin.findByIdAndUpdate(mu_id, {
            $set: {
                flname,
                email,
                password: passwordHash, // Update the password only if it has changed
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

        let phoneNumber = process.env.HOSPITAL_Number;
        let emailAddress = process.env.HOSPITAL_EMAIL;



        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${flname}, We hope this message finds you well.</p>

        <p>We wanted to inform you that there has been an update to your information in our database. The details that have been modified include:</p>

        <p>New Information:</p>
        <ul>
            <li>Full Name: ${flname}</li>
            <li>Email Address: ${email}</li>
            <li>Phone Number: ${number}</li>
            <li>Specialty: ${specialty}</li>
            <li>Username: ${username}</li>
            <li>Address: ${address}</li>
            <li>Facebook Handle: ${facebook}</li>
            <li>Twitter Handle: ${twitter}</li>
            <li>Linkedin Handle : ${linkedin}</li>>
        </ul>

        <p>Please review the changes to ensure that they accurately reflect your information. If you believe any information is incorrect or if you have any questions regarding the update, please don't hesitate to reach out to our administrative team at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>.</p>

        <p>We value your continued association with us, and it's important to us that your records are kept up-to-date for your convenience and our records.</p>

        <p>Thank you for your prompt attention to this matter. We appreciate your trust in our services and are here to assist you with any further inquiries you may have.</p>

        <p>Best regards,<br>
        The Korex Hospital Team</p>`;


        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Information Update Confirmation',
            html: msg,
            attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email sending error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
        req.flash('success_msg', 'Dear ' + flname + ', Your Information Successfully Updated');
        res.redirect('/backend/allDoctor');
    } catch (error) {
        console.error('Error updating admin:', error);
        req.flash('error_msg', 'An error occurred while updating admin information.');
        res.redirect('/backend/dashboard/' + mu_id); // Redirect to the edit page with an error message
    }

};

const deleteDoctorProfile = async (req, res) => {
    const id = req.params.mu_id;
    Doctors.findByIdAndDelete(id)

    .then(() => {
        req.flash(`success_msg`, 'Doctor deleted successfully');
        res.redirect(`/backend/allDoctor`)
    })
    .catch(() => {
        res.send(`Error`)
        res.redirect(`/backend/addDoctor`)
    }) 
};

//PATIENTS SECTION
const addPatient = (req, res) => {
    const admin = req.user;
    res.render('backend/addPatient', { admin });
};

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

const addPatientPost = async (req, res) => {

    const { name, username, email, gender, dob, number, address,city, state, password, password2, occupation, diagnosis, treatment, bloodGroup } = req.body;
    const admin = req.user;
    let errors = [];

    //check required fields
    if (!name || !username || !email || !gender || !dob || !number || !address || !city || !state || !password || !password2 || !occupation || !bloodGroup) {
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
                username,
                email,
                gender,
                dob,
                number,
                address,
                city,
                state,
                password,
                password2,
                occupation,
                bloodGroup,
                admin,
    
            });
    
        } else {
    
            try {
                // Check if the email is already registered in the notRegister table
                const notRegisteredUserExists = await notRegistered.findOne({  $or: [{ email }, { username }] });

                if (notRegisteredUserExists) {
                    errors.push({ msg: 'Email or Username already registered' });
    
                    // Render the registration page with errors
                    res.render('backend/addPatient', {
                        errors,
                        name,
                        username,
                        email,
                        gender,
                        dob,
                        number,
                        address,
                        city,
                        state,
                        password,
                        password2,
                        occupation,
                        bloodGroup,
                        admin,
                    });
                } else {
                    // Check if the email nd username is already registered in the User table
                    const registeredUserExists = await User.findOne({ $or: [{ email }, { username }]  });
    
                    if (registeredUserExists) {
                        errors.push({ msg: 'Email or username already registered' });
    
                        // Render the registration page with errors
                        res.render('backend/addPatient', {
                            errors,
                            name,
                            username,
                            email,
                            gender,
                            dob,
                            number,
                            address,
                            city,
                            state,
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
                            username,
                            email,
                            gender,
                            dob,
                            number,
                            address,
                            city,
                            state,
                            password: hashedPassword,
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

                        let phoneNumber = process.env.HOSPITAL_Number;
                        let emailAddress = process.env.HOSPITAL_EMAIL;

                        let msg = `
                        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
                        <p>Dear ${name},  We are delighted to welcome you to Korex Hospital! Thank you for choosing us as your healthcare provider. We are committed to providing you with the highest quality medical care and ensuring your well-being.</p>
    
                        <p>Your registration with us is now complete, and your patient account is active. Here are some important details.</p>
                        <p>Here are some important details to get you started:</p>
                        <ul>
                            <li>Full Name: ${name}</li>
                            <li>Username: ${username}</li>
                            <li>Date of Birth: ${dob}</li>
                            <li>Phone Number: ${number}</li>
                            <li>Home Address: ${address}</li>
                            <li>City: ${city}</li>
                            <li>State: ${state}</li>
                            <li>Occupation: ${occupation}</li>
                            <li>Diagnosis: ${diagnosis}</li>
                            <li>Blood Group: ${bloodGroup}</li>
                            <li>Email Address: ${email}</li>
                        </ul>
        
                        <p>Medical Appointments: You can now schedule medical appointments with our healthcare professionals. Our team is dedicated to providing you with personalized care and addressing your healthcare needs.</p>
        
    
                        <p>If you have any questions or require any assistance as you settle in, please feel free to reach out to our HR department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>.</p>
    
                        <p>Once again, welcome to Korex Hospital. We look forward to serving your healthcare needs and ensuring your health and well-being. We are here for you every step of the way.</p>
    
    
                        <p>Best regards,<br>
                        The Korex Hospital Team</p>`;
    
                        const mailOptions = {
                            from: process.env.NODEMAILER_EMAIL,
                            to: email,
                            subject: 'Welcome to Korex Hospital Account Confirmation',
                            html: msg,
                            attachments: [
                                {
                                    filename: 'Creat.jpg',
                                    path: './public/assets/img/Creat.jpg',
                                    cid: 'Creat'
                                }
                            ]
    
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
};

// REGISTERED PATIENTS
const registeredPatients = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 8; // Number of items per page
        const totalPosts = await User.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const admin = req.user;

        const myPatient = await User.find()
            .sort({ date_added: -1 }) // Sort by date_added in descending order
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/allpatients', { myPatient, admin, totalPages, currentPage: page });
    } catch (error) {
        // Handle any errors, e.g., by sending an error response
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const searchPatient = async (req, res) => {
    try {
        // Use req.body to get the name from the form input
        const patientName = req.body.name; 
        // Use a regular expression to perform a case-insensitive search for the patient's name
        const query = {
            name: { $regex: new RegExp(patientName, 'i') } // 'i' for case-insensitive
        };
        const admin = req.user;
        const users = await User.find(query);

        res.render('backend/searchPatient', { users, admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/allpatients');
    } 
};

const viewAllPatients = async (req, res) => {
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
}

const editPatient = (req, res) => {
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
};
const editPatientPost = async (req, res) => {
    
    try {
        const admin = req.user;
        let errors = [];
        const mu_id = req.params.mu_id;

        const { name, username, email, gender, dob, number, address,city,state, password, occupation,diagnosis,treatment,bloodGroup } = req.body;

       // Check if a new image was uploaded
       let newImage = {};
       if (req.file) {
        newImage = {
            data: fs.readFileSync(path.join(__dirname, '../public/patientImage/' + req.file.filename)),
            contentType: 'image/png',
        };
        }

        // Find the existing User to get the current image
        const existingUser = await User.findById(mu_id);

        // Retain the existing image or use the new image
        const userImage = req.file ? newImage : (existingUser ? existingUser.image : {});

        // Hash the new password if it has been changed
        let passwordHash;
        if (password && password !== existingUser.password) {
            passwordHash = bcrypt.hashSync(password, 10);
        } else {
            // If the password hasn't changed, retain the existing hashed password
            passwordHash = existingUser.password;
        }

        // Update the document with the hashed password
        await User.findByIdAndUpdate(mu_id, {
            $set: {
                name,
                username,
                email,
                gender,
                dob,
                number,
                address,
                city,
                state,
                password: passwordHash, // Update the password only if it has changed
                occupation,
                diagnosis,
                treatment,
                bloodGroup,
                image: userImage,
                admin,
            }
        });

        let phoneNumber = process.env.HOSPITAL_Number;
        let emailAddress = process.env.HOSPITAL_EMAIL;



        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${name}, We hope this message finds you well.</p>

        <p>We wanted to inform you that there has been an update to your information in our database. The details that have been modified include:</p>

        <p>New Information:</p>
        <ul>
            <li>Full Name: ${name}</li>
            <li>Email Address: ${username}</li>
            <li>Email Address: ${email}</li>
            <li>Phone Number: ${number}</li>
            <li>Home Address: ${address}</li>
            <li>City: ${city}</li>
            <li>State: ${state}</li>
            <li>Occupation: ${occupation}</li>
            <li>Blood Group: ${bloodGroup}</li>
        </ul>

        <p>Please review the changes to ensure that they accurately reflect your information. If you believe any information is incorrect or if you have any questions regarding the update, please don't hesitate to reach out to our administrative team at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>.</p>

        <p>We value your continued association with us, and it's important to us that your records are kept up-to-date for your convenience and our records.</p>

        <p>Thank you for your prompt attention to this matter. We appreciate your trust in our services and are here to assist you with any further inquiries you may have.</p>

        <p>Best regards,<br>
        The Korex Hospital Team</p>`;


        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Information Update Confirmation',
            html: msg,
            attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email sending error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
        req.flash('success_msg', 'Dear ' + name + ', Your Information Successfully Updated');
        res.redirect('/backend/allpatients');
    } catch (error) {
        console.error('Error updating admin:', error);
        req.flash('error_msg', 'An error occurred while updating admin information.');
        res.redirect('/backend/dashboard/' + mu_id); // Redirect to the edit page with an error message
    }

};

// ADD PATIENT MEDICAL RECORD 
const addMedicalRecord = (req, res) => {
    const userId = req.params.m_id; // Assuming this is the user's ObjectID
    const admin = req.user;
    User.findById(userId)
    .then((user) => {
        res.render(`backend/addmedicalrecord`, { user, admin });
    })
    .catch((err) => {
        res.send(`There's a problem selecting from DB`);
        res.redirect('/backend/allpatients');
        console.log(err);
    });
};

const addMedicalRecordPost = async (req, res) => {
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
};

const deleteRegisteredPatient = (req, res) => {
    const id = req.params.mu_id;
    User.findByIdAndDelete(id)

    .then(() => {
        req.flash(`success_msg`, 'Doctor deleted successfully');
        res.redirect(`/backend/allpatients`)
    })
    .catch(() => {
        res.send(`Error`)
        res.redirect(`/backend/dashboard`)
    }) 
};

// UNREGISTERED PATIENTS
const unregisteredPatients = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await notRegistered.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);
    const admin = req.user;

    const unregisteredPatient = await notRegistered.find()
        .sort({ date_added: -1 }) // Sort by date_added in descending order
        .skip((page - 1) * perPage)
        .limit(perPage);
    res.render('backend/unregis_patient', { admin, unregisteredPatient, totalPages, currentPage: page });
};

const searchUnregisterPatient = async (req, res )=> {
    try {
        // Use req.body to get the name from the form input
        const unregisterName = req.body.name; 
        // Use a regular expression to perform a case-insensitive search for the patient's name
        const query = {
            name: { $regex: new RegExp(unregisterName, 'i') } // 'i' for case-insensitive
        };
        const admin= req.user;
        const outputUnregisterList = await notRegistered.find(query);
        res.render('backend/searchUnregisterPatient', { outputUnregisterList,admin });
    } catch (err) {
        console.error(err);
        res.redirect('/backend/unregis_patient');
    }
};

//MOVE PATIENT FROM UNREGISTER TO REGISTER TABLE
const registerPatient = async (req, res) => {
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
            username: patientToRegister.username,
            email: patientToRegister.email,
            number: patientToRegister.number,
            password: patientToRegister.password,
            dob: patientToRegister.dob,
            gender: patientToRegister.gender,
            address: patientToRegister.address,
            city: patientToRegister.city,
            state: patientToRegister.state,
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
};

const deleteUnregisteredPatient = (req, res) => {
    const mid = req.params.m_id;
    notRegistered.findByIdAndDelete(mid)
    .then(() => {
        req.flash(`success_msg`, 'Data deleted successfully');
        res.redirect(`/backend/unregis_patient`)
    })
    .catch(() => {
        res.send(`Data deleted successfully`)
    })
};

//PAYMENT SECTION
const patientPayment = async (req, res) => {
    try {
        const users = await User.find({}, 'name');
        const admin = req.user;

        const page = parseInt(req.query.page) || 1;
        const perPage = 8; // Number of items per page
        const totalPosts = await PatientPayment.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const patientPayment = await PatientPayment.find()
            .sort({ date_added: -1 }) // Sort by date_added in descending order
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/patientPayment', { patientPayment, admin, totalPages, currentPage: page, users });
    } catch (err) {
        console.error(err);
        // Handle any errors
        res.status(500).send('Internal Server Error');
    }
};

const patientPaymentPost = async (req, res) => {
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
         
        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${patientName},  We are pleased to inform you that your payment has been successfully received. We greatly appreciate your patronization to Korex hospital.</p>
    
       
		 <p>Payment Details:</p>
        <ul>
            <li>Full Name: ${patientName}</li>
            <li>Amount Paid: ${totalAmount}</li>
            <li>Payment Date: ${paymentDate}</li>
			<li>Payment Method: ${paymentMethod}</li>
			<li>Payment Purpose: ${paymentPurpose}</li>
			<li>Payment Status: ${paymentStatus}</li>
			
        </ul>
        
        <p>If you have any questions or concerns regarding your payment or need further assistance, please don't hesitate to contact our Human Resources department. Your satisfaction is important to us, and we are here to assist you.</p>
        
        <p>Thank you for your continued commitment to Korex hospital, and we look forward to your continued contributions in the future.</p>
    
        <p>Best regards,<br>
        The Korex Hospital Team</p>`;

           const mailOptions = {
               from: process.env.NODEMAILER_EMAIL,
               to: email,
               subject: ' Bill Payment Confirmation',
               html: msg,
               attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
           };

           transporter.sendMail(mailOptions, (error, info) => {
               if (error) {
                   console.log('Email sending error:', error);
               } else {
                   console.log('Email sent:', info.response);
               }
           });
           req.flash('success_msg', 'Payment Successful');
           res.redirect('/backend/patientPayment');
       } catch (err) {
           console.error(err);
           req.flash('error', 'An error occurred while booking the appointment');
           res.redirect('/backend/patientPayment');
       }
   }
};

const searchPatientPay = async (req, res)=> {
    try {
        const admin = req.user;
        // Use req.body to get the name from the form input
        const Patientpay = req.body.patientName; 
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
};

const deletePatientPayment = (req, res) => {
    const mid = req.params.mu_id;
    PatientPayment.findByIdAndDelete(mid)
    .then(() => {
        req.flash(`success_msg`, 'Data deleted successfully');
        res.redirect(`/backend/patientPayment`)
    })
    .catch(() => {
        res.send(`error`)
    })
};

//DOCTORS PAYMENT SECTIONS
const doctorPayment = async (req, res) => {
    try {
        // pupulatiin the doctor name, speciality and email
        const doctors = await Doctors.find({}, 'flname specialty email');
        const admin = req.user;

        const page = parseInt(req.query.page) || 1;
        const perPage = 6; // Number of items per page
        const totalPosts = await DoctorPayment.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const doctorPayment = await DoctorPayment.find()
            .sort({ date_added: -1 }) // Sort by date_added in descending order
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('backend/doctorPayment', { doctorPayment,admin, doctors, totalPages, currentPage: page });
    } catch (err) {
        console.error(err);
        // Handle any errors
        res.status(500).send('Internal Server Error');
    }
};

const doctorPaymentPost = async (req, res) => {
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

     try {
         newDoctorPayment.save();
        
         let phoneNumber = process.env.HOSPITAL_Number;
         let emailAddress = process.env.HOSPITAL_EMAIL;
 
         let msg = `
         <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
         <p>Dear ${doctorName},  We are pleased to inform you that your salary payment for the month of ${paymentDate} has been successfully processed and paid. We greatly appreciate your hard work and dedication to Korex hospital.</p>
     
        
          <p>Salary Payment Details:</p>
         <ul>
             <li>Full Name: ${doctorName}</li>
             <li>Amount Paid: ${totalAmount}</li>
             <li>Payment Date: ${paymentDate}</li>
             <li>Payment Method: ${paymentMethod}</li>
             <li>Payment Purpose: ${paymentPurpose}</li>
             <li>Payment Status: ${paymentStatus}</li>
             
         </ul>
         
         <p>If you have any questions or concerns regarding your salary payment or need further assistance, please don't hesitate to contact our Human Resources department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
        
         <p>Thank you for your continued commitment to Korex hospital, and we look forward to your continued contributions in the future..</p>
     
     
         <p>Best regards,<br>
         The Korex Hospital Team</p>`;
         
         const mailOptions = {
             from: process.env.NODEMAILER_EMAIL,
             to: doctorEmail,
             subject: 'Salary Payment Confirmation',
             html: msg,
             attachments: [
                {
                    filename: 'Creat.jpg',
                    path: './public/assets/img/Creat.jpg',
                    cid: 'Creat'
                }
            ]
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
};

const searchDoctorPayment = async(req, res) => {
    try {
        // Use req.body to get the name from the form input
        const docPay = req.body.doctorName; 
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
};

const editDoctorPayment = (req, res) => {
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
};

const editDoctorPaymentPost = async (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;
    const admin = req.user;
    const { doctorName, doctorEmail, speciality, paymentPurpose, paymentDate, totalAmount, paymentMethod, paymentStatus } = req.body;
    

    DoctorPayment.findByIdAndUpdate(mu_id, { $set: { doctorName, doctorEmail, speciality, paymentPurpose, paymentDate, totalAmount, paymentMethod, paymentStatus } })

        .then(() => {

            let phoneNumber = process.env.HOSPITAL_Number;
            let emailAddress = process.env.HOSPITAL_EMAIL;
    
            let msg = `
            <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
            <p>Dear ${doctorName},  We hope this message finds you well. We wanted to inform you about a recent update regarding your payment confirmation. Here are the details of the update.</p>
        
           
             <p>New Information:</p>
            <ul>
                <li>Full Name: ${doctorName}</li>
                <li>Amount Paid: ${totalAmount}</li>
                <li>Payment Date: ${paymentDate}</li>
                <li>Payment Method: ${paymentMethod}</li>
                <li>Payment Purpose: ${paymentPurpose}</li>
                <li>Payment Status: ${paymentStatus}</li>
                
            </ul>
            
            <p>If you have any questions or concerns regarding this update or your payment, please don't hesitate to contact our billing department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
           
            <p>We appreciate your continued dedication and hard work as a member of our healthcare team. Thank you for choosing to be a part of Korex hospital.</p>
        
        
            <p>Best regards,<br>
            The Korex Hospital Team</p>`;

            const mailOptions = {
                from: process.env.NODEMAILER_EMAIL,
                to: doctorEmail,
                subject: 'Payment Confirmation Update',
                html: msg,
                attachments: [
                    {
                        filename: 'Creat.jpg',
                        path: './public/assets/img/Creat.jpg',
                        cid: 'Creat'
                    }
                ]
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
};

const deleteDoctorPay = (req, res) => {
    const mid = req.params.mu_id;
    DoctorPayment.findByIdAndDelete(mid)
    .then(() => {
        req.flash(`success_msg`, 'Doctor payment deleted successfully');
        res.redirect(`/backend/doctorPayment`)
    })
    .catch(() => {
        res.send(`error`)
    })
};

//HOSPITAL EXPENSES 
const hospitalExpenses = async (req, res) => {
    const admin = req.user;
    const page = parseInt(req.query.page) || 1;
    const perPage = 8; // Number of items per page
    const totalPosts = await HospitalExpenses.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const hospitalExpenses = await HospitalExpenses.find()
        .sort({ date_added: -1 }) // Sort by date_added in descending order
        .skip((page - 1) * perPage)
        .limit(perPage);

    res.render('backend/hospitalExpenses', { hospitalExpenses,admin, totalPages, currentPage: page });
};

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

const hospitalExpensesPost = async (req, res) => {
    
    const admin = req.user;
    const { expenseType, expenseDate, expenseAmount, expenseVendorSupplier, expenseCategoryDepartment, expenseAuthorizedBy, paymentMethod,paymentStatus } = req.body;

    //check required fields
    if (!expenseType || !expenseDate || !expenseAmount || !expenseVendorSupplier || !expenseCategoryDepartment || !expenseAuthorizedBy || !paymentMethod || !paymentStatus) {
        req.flash(`error`, `Please fill all fields`);
        res.redirect(`/backend/hospitalExpenses`);
    }  
   
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
};

const searchHospitalExpenses = async (req, res) => {
    try {
        const admin = req.user;
         // Use req.body to get the name from the form input
        const expenses = req.body.expenseType;
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
};

const editHospiExpenses =  (req, res) => {
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
};

const editHospiExpensePost = (req, res) => {
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
};

const deletehospital = (req, res) => {
    const mid = req.params.mu_id;
    HospitalExpenses.findByIdAndDelete(mid)
    .then(() => {
        req.flash(`success_msg`, 'Data deleted successfully');
        res.redirect(`/backend/hospitalExpenses`)
    })
    .catch(() => {
        res.send(`error`)
    })
};

// Admin logout
const adminLogout = (req, res) => {
    // Perform logout logic (e.g., destroy the session)
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        res.clearCookie('connect.sid'); // Clear session cookie
                res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
                res.header('Pragma', 'no-cache');
                res.header('Expires', '-1');
                req.session.destroy(); // Clear the session
        res.redirect('/backend/adminlogin');
    });
};

module.exports = ({
    adminloginPage, adminloginPagePost, adminDashboard, adminSection, uploads, addNewAdminPost, editAdmininformation, editAdmininformationPost, deleteAdminProfile, appointmentSection, searchAppointment, viewAppointment, editAppointment, editAppointmentPost,deleteAppointment,addDoctor,upload, addDoctorPost,allDoctor, searchDoctor, doctorProfile, editDoctor, editDoctorProfilePost, deleteDoctorProfile, addPatient,upl, addPatientPost,registeredPatients,searchPatient, viewAllPatients,editPatient,editPatientPost,addMedicalRecord,addMedicalRecordPost, deleteRegisteredPatient, unregisteredPatients,searchUnregisterPatient, registerPatient, deleteUnregisteredPatient,patientPayment,patientPaymentPost, searchPatientPay,deletePatientPayment,doctorPayment, doctorPaymentPost,searchDoctorPayment,editDoctorPayment,editDoctorPaymentPost,deleteDoctorPay,hospitalExpenses,upld,hospitalExpensesPost,searchHospitalExpenses,editHospiExpenses,editHospiExpensePost,deletehospital,adminLogout
});


