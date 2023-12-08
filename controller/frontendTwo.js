const express = require(`express`);
const ejs = require('ejs');
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');


const app = express();
const  User = require('../models/User');
const { Appointment, Contact } = require('../models/appointment');
const MedicalRecord = require('../models/addmedicalrecord');


// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});

router.get('/users/welcome', async (req, res) => {
    try {
        console.log('Checking session variables...');
        if (!req.session.user_id && !req.session.email) {
            console.log('Session variables not found. Redirecting to login...');
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        console.log('Session variables found. Retrieving user information...');

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Find the user by user_id
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // You can query the Appointment collection here, assuming there's a reference between User and Appointment collections
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Set the number of appointments per page
        const skip = (page - 1) * limit;

        const allAppointments = await Appointment.find({ user: uID }).sort({ date: -1 });
        const medicalRecord = await MedicalRecord.find({ user_id: user._id }).sort({ date: -1 });

        const totalAppointments = allAppointments.length;
        const totalPages = Math.ceil(totalAppointments / limit);

        const appointments = allAppointments.slice(skip, skip + limit);

        // console.log(uID);
        // console.log(uEmail);

         // Add the following lines to set no-cache headers
         res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
         res.header('Pragma', 'no-cache');

        //  console.log(medicalRecord)
        res.render('users/welcome', {uID, uEmail,user,appointments, medicalRecord, currentPage: page,totalPages: totalPages, });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});



router.post(`/patientAppointment`, (req, res) => {
    // Get the user's ObjectId from the session (assuming you have the user's ObjectId in req.session.user_id)
    const userId = req.session.user_id;

    // Check if the user is logged in
    if (!userId) {
        req.flash('error_msg', 'Please login to access the App');
        return res.redirect('/registration/login');
    }

    // Using data destructuring
    const { flname, email, department, date, textarea, number, disease } = req.body;

    // Check required fields
    if (!flname || !email || !department || !date || !textarea || !number || !disease) {
        req.flash('error', 'Please fill all fields');
      
        return res.redirect('users/welcome');
    }

    // Add the following lines to set no-cache headers
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.header('Pragma', 'no-cache');


    // Create a new appointment associated with the user
    const newAppointment = new Appointment({
        flname,
        email,
        department,
        date,
        textarea,
        number,
        disease,
        user: userId,
    });

    try {
        // Save the appointment to the database
        newAppointment.save();

        // Send an email notification
        let msg =
                'Dear ' + flname + ", we are pleased to inform you that your appointment with Korex Hospital has been successfully scheduled. Below are the details of your appointment:\n\n" +
                "Full Name: " + flname + "\n" +
                "Department: " + department + "\n" +
                "Phone Number: " + number + "\n" +
                "Disease: " + disease + "\n" +
                "Scheduled Appointment Date: " + date + "\n\n" +
                "Please arrive at least 15 minutes before your scheduled appointment time. If you have any changes or need to reschedule, please contact us at least 24 hours in advance. We look forward to providing you with excellent healthcare services. If you have any questions or need further assistance, feel free to reach out to our customer service team. Thank you for choosing Korex Hospital for your medical needs.";

        const mailOptions = {
            from: 'ibro4grace@gmail.com',
            to: email,
            subject: 'Your Appointment with Korex Hospital is Confirmed',
            text: msg,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email sending error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        req.flash('success_msg', 'Appointment Successfully Scheduled');
        res.redirect('users/welcome');
    } catch (err) {
        console.log(err);
        req.flash('error', 'An error occurred while booking the appointment');
        res.redirect('users/welcome');
    }
});

router.get('/users/readMore/:appointmentId', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Query the User collection for the user with the specified _id
        const user = await User.findOne({ _id: uID });

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // Get the appointment ID from the URL
        const appointmentId = req.params.appointmentId;

        // Query the appointments collection to find the specific appointment record
        const appointment = await Appointment.findOne({ _id: appointmentId });
        const appointments = await Appointment.find({ user: uID });

        if (!appointment) {
            req.flash('error_msg', 'Appointment not found');
            return res.redirect('/users/welcome');
        }

        // Render the readMore page and pass the full appointment text
        res.render('users/readMore', { user, appointments, appointmentText: appointment.textarea });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});


router.get('/users/editPatientAppointment/:appointmentId', async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Find the user by user_id
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // Fetch the appointment to edit based on mu_id
        const appointmentId = req.params.appointmentId;
        const appointments = await Appointment.findOne({_id: appointmentId  }).sort({ date: -1 });
    

        res.render('users/editPatientAppointment', { user, appointments });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});


router.post(`/users/editPatientAppointment/:mu_id`, (req, res) => {
    let errors = [];

    const mu_id = req.params.mu_id;

    const { flname, email, department, date, textarea, number, disease } = req.body;

    Appointment.findByIdAndUpdate(mu_id, { $set: { flname, email, department, date, textarea, number, disease } })

        .then(() => {

            let msg = 'Dear ' + flname + `,\n\n` +

                `We hope this message finds you well. We wanted to inform you about a recent update regarding your appointment. Here are the details of the update:.\n\n` +

                'New Information:\n\n' +
                "Name: " + flname + "\n" +
                "Department: " + department + "\n" +
                "Appointment Date: " + date + "\n" +
                "Symptoms: " + disease + "\n" +
                "Appointment Purpose: " + textarea + "\n\n" +
             

                "If you have any questions or concerns regarding this update of your appointment, please don't hesitate to contact our department at 2347033731378. We're here to assist you..\n\n" +

                "We appreciate your continued dedication and patronization to our healthcare team. Thank you for choosing to be a part of Korex hospital...\n\n" +

                "warm regards,\n" +
                "Korex Hospital";

            const mailOptions = {
                from: 'ibro4grace@gmail.com',
                to: email,
                subject: 'Appointment Confirmation Update',
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
            req.flash(`success_msg`, 'Information Successfully Updated');
            res.redirect('/users/appointmentHistory');

        })
        .catch((err) => {
            console.log(err)
            res.send(`There is issue with your information`)
            res.redirect('/users/welcome');

        })



});

router.get(`/deleteApointments/:mu_id`, (req, res) => {


    const mid = req.params.mu_id;
    Appointment.findByIdAndDelete(mid)

        .then(() => {
            req.flash(`success_msg`, 'Data deleted successfully');
            res.redirect(`/users/welcome`)
        })
        .catch(() => {

            res.send(`error`)
        })
});

router.get('/users/bookAppointment', async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Find the user by user_id
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // You can query the Appointment collection here, assuming there's a reference between User and Appointment collections
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Set the number of appointments per page
        const skip = (page - 1) * limit;

        const allAppointments = await Appointment.find({ user: uID }).sort({ date: -1 });
        const medicalRecord = await MedicalRecord.find({ user_id: user._id }).sort({ date: -1 });

        const totalAppointments = allAppointments.length;
        const totalPages = Math.ceil(totalAppointments / limit);

        const appointments = allAppointments.slice(skip, skip + limit);

        // console.log(uID);
        // console.log(uEmail);

         // Add the following lines to set no-cache headers
         res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
         res.header('Pragma', 'no-cache');

        //  console.log(medicalRecord)
        res.render('users/bookAppointment', {uID, uEmail,user,appointments, medicalRecord, currentPage: page,totalPages: totalPages, });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});


router.get('/users/appointmentHistory', async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Find the user by user_id
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // You can query the Appointment collection here, assuming there's a reference between User and Appointment collections
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Set the number of appointments per page
        const skip = (page - 1) * limit;

        const allAppointments = await Appointment.find({ user: uID }).sort({ date: -1 });
        const medicalRecord = await MedicalRecord.find({ user_id: user._id }).sort({ date: -1 });

        const totalAppointments = allAppointments.length;
        const totalPages = Math.ceil(totalAppointments / limit);

        const appointments = allAppointments.slice(skip, skip + limit);

        // console.log(uID);
        // console.log(uEmail);

         // Add the following lines to set no-cache headers
         res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
         res.header('Pragma', 'no-cache');

        //  console.log(medicalRecord)
        res.render('users/appointmentHistory', {uID, uEmail,user,appointments, medicalRecord, currentPage: page,totalPages: totalPages, });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});
router.get('/users/medicalRecord', async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Find the user by user_id
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // You can query the Appointment collection here, assuming there's a reference between User and Appointment collections
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Set the number of appointments per page
        const skip = (page - 1) * limit;

        const allAppointments = await Appointment.find({ user: uID }).sort({ date: -1 });
        const medicalRecord = await MedicalRecord.find({ user_id: user._id }).sort({ date: -1 });

        const totalAppointments = allAppointments.length;
        const totalPages = Math.ceil(totalAppointments / limit);

        const appointments = allAppointments.slice(skip, skip + limit);

        // console.log(uID);
        // console.log(uEmail);

         // Add the following lines to set no-cache headers
         res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
         res.header('Pragma', 'no-cache');

        //  console.log(medicalRecord)
        res.render('users/medicalRecord', {uID, uEmail,user,appointments, medicalRecord, currentPage: page,totalPages: totalPages, });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});



router.get('/users/viewRecords/:recordId', async (req, res) => {
    try {
        // Check if the user is logged in (you can keep this part)
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Get the medical record ID from the URL
        const recordId = req.params.recordId;

        // Query the User collection for the user with the specified _id
        const user = await User.findOne({ _id: uID });
        // console.log('User found:', user);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // Query the MedicalRecord collection to find the specific record
        const medicalRecord = await MedicalRecord.findOne({ _id: recordId });
        const appointments = await Appointment.find({ user: uID }).sort({ date: -1 });

        if (!medicalRecord) {
            req.flash('error_msg', 'Medical record not found');
            return res.redirect('/users/viewRecords');
        }

        // Pagination for Medical Records
        const page = parseInt(req.query.page) || 1;
        const perPage = 5; // Number of items per page

        // Calculate total posts and total pages
        const totalPosts = await MedicalRecord.countDocuments({ user_id: user });
        const totalPages = Math.ceil(totalPosts / perPage);

        // Query for medical records with pagination
        const medicalRecords = await MedicalRecord.find({ user_id: user })
            .sort({ date: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        // Render the viewRecords page with the specific medical record and pagination data
        res.render('users/viewRecords', { user, medicalRecord, appointments, totalPages, currentPage: page, medicalRecords });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
});


router.get('/users/printable/:recordId', async(req, res) => {

    try {
        // Check if the user is logged in (you can keep this part)
        if (!req.session.user_id && !req.session.email) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

        const uID = req.session.user_id;
        const uEmail = req.session.email;

        // Get the medical record ID from the URL
        const recordId = req.params.recordId;

        // Query the User collection for the user with the specified _id
        const user = await User.findOne({ _id: uID });
        // console.log('User found:', user);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // Query the MedicalRecord collection to find the specific record
        const medicalRecord = await MedicalRecord.findOne({ _id: recordId });
        const appointments = await Appointment.find({ user: uID }).sort({ date: -1 });

        if (!medicalRecord) {
            req.flash('error_msg', 'Medical record not found');
            return res.redirect('/users/printable');
        }
         

        // Render the viewRecords page with the specific medical record and pagination data
        res.render('users/printable', { user, medicalRecord, appointments });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
   
  
});




// logout User
router.get('/signout', (req, res) => {  

    // Destroy the user's session
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
           
        }
        // Redirect the user to the login page or any other page as needed
        res.redirect('/');
       
    });
});

module.exports = router;