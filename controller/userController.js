const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const  User = require('../models/User');
const MedicalRecord = require('../models/addmedicalrecord');
const { Appointment, Contact } = require('../models/appointment');



// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: process.env.MAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});

const userLandingPage = async (req, res) => {
    try {
        console.log('Checking session variables...');
        if (!req.session.user_id && !req.session.username) {
            console.log('Session variables not found. Redirecting to login...');
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        console.log('Session variables found. Retrieving user information...');

        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        //querying the Appointment collection here for the user
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPosts = await Appointment.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const appointments = await Appointment.find({ user: uID })
        .sort({ date_added: -1 }) // Sort by date_added in descending order
        .skip((page - 1) * perPage)
        .limit(perPage);

        res.render('users/welcome', {user, appointments,  totalPages, currentPage: page });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
};

//BOOK APPOINTMENT 
const bookAppointment = async (req, res) => {
    try {

        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }

            // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }
        
        res.render('users/bookAppointment', {user });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
};

const bookAppointmentPost = async (req, res) => {

    // Get the user's ObjectId from the session (assuming you have the user's ObjectId in req.session.user_id)
    const userId = req.session.user_id;
    if (!userId) {
        req.flash('error_msg', 'Please login to access the App');
        return res.redirect('/registration/login');
    }

    const { flname, email, department, date, textarea, number, disease } = req.body;

    // Check required fields
    if (!flname || !email || !department || !date || !textarea || !number || !disease) {
        req.flash('error', 'Please fill all fields');
        return res.redirect('users/welcome');
    }

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
        let phoneNumber = process.env.HOSPITAL_Number;
        let emailAddress = process.env.HOSPITAL_EMAIL;

        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${flname}, we are pleased to inform you that your appointment with Korex Hospital has been successfully scheduled. Below are the details of your appointment:</p>
   
        <ul>
            <li>Full Name: ${flname}</li>
             <li>Department: ${department}</li>
             <li>Phone Number: ${number}</li>
            <li>Purpose: ${disease}</li>
            <li>Scheduled Appointment Date: ${date}</li>
        </ul>
        
        <p>Please arrive at least 15 minutes before your scheduled appointment time. If you have any changes or need to reschedule, please contact us at least 24 hours in advance.</p>
        
        <p>We look forward to providing you with excellent healthcare services. If you have any questions or need further assistance, feel free to reach out to our customer service team at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
       
        <p>Thank you for choosing Korex Hospital for your medical needs.</p>
    
        <p>Best regards,<br>
        The Korex Hospital Team</p>`;

        const mailOptions = {
           from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Your Appointment with Korex Hospital is Confirmed',
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

        req.flash('success_msg', 'Appointment Successfully Scheduled');
        res.redirect('/users/appointmentHistory');
    } catch (err) {
        console.error(err);
        req.flash('error', 'An error occurred while booking the appointment');
        res.redirect('/users/welcome');
    }
};

const appointmentHistory = async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        //querying the Appointment collection here for the user
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPosts = await Appointment.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const appointments = await Appointment.find({ user: uID })
        .sort({ date_added: -1 }) // Sort by date_added in descending order
        .skip((page - 1) * perPage)
        .limit(perPage);

        res.render('users/appointmentHistory', {user, appointments,  totalPages, currentPage: page });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
};

const readMore = async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);

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
};

const editPatientAppointment = async (req, res) =>{
    try {
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }
        // Fetch the appointment to edit based on id
        const appointmentId = req.params.appointmentId;
        const appointments = await Appointment.findOne({_id: appointmentId  });

        res.render('users/editPatientAppointment', { user, appointments });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
};

const editPatientAppointmentPost = async (req, res) =>{
    let errors = [];

    const mu_id = req.params.mu_id;

    const { flname, email, department, date, textarea, number, disease } = req.body;

    Appointment.findByIdAndUpdate(mu_id, { $set: { flname, email, department, date, textarea, number, disease } })

        .then(() => {

            let phoneNumber = process.env.HOSPITAL_Number;
            let emailAddress = process.env.HOSPITAL_EMAIL;
    
            let msg = `
            <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
            <p>Dear ${flname}, We hope this message finds you well. We wanted to inform you about a recent update regarding your appointment. Here are the details of the update.</p>
        
             <p>New Information:</p>
            <ul>
                <li>Full Name: ${flname}</li>
                 <li>Department: ${department}</li>
                 <li>Appointment Date: ${date}</li>
                <li>Symptoms: ${disease}</li>
                <li>Appointment Purpose: ${textarea}</li>
            </ul>
            
            <p>If you have any questions or concerns regarding this update of your appointment, please don't hesitate to contact our department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
           
            <p>We appreciate your continued dedication and patronization to our healthcare team. Thank you for choosing to be a part of Korex hospital.</p>
        
            <p>Best regards,<br>
            The Korex Hospital Team</p>`;

            const mailOptions = {
                from: process.env.NODEMAILER_EMAIL,
                to: email,
                subject: 'Appointment Confirmation Update',
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

            req.flash(`success_msg`, 'Information Successfully Updated');
            res.redirect('/users/appointmentHistory');
        })
        .catch((err) => {
            console.error(err)
            res.send(`There is issue with your information`)
            res.redirect('/users/welcome');

        })
};

const deleteApointments = (req, res) => {
    const mid = req.params.mu_id;
    Appointment.findByIdAndDelete(mid)
    .then(() => {
        req.flash(`success_msg`, 'Data deleted successfully');
        res.redirect(`/users/appointmentHistory`)
    })
    .catch(() => {
        res.send(`error`)
    })
};

//MEDICAL RECORD 
const medicalRecord = async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);
    
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }
    
        //querying the Appointment collection here for the user
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const totalPosts = await MedicalRecord.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);
    
        const medicalRecord = await MedicalRecord.find({ user_id: uID})
        .sort({ date_added: -1 }) // Sort by date_added in descending order
        .skip((page - 1) * perPage)
        .limit(perPage);

        res.render('users/medicalRecord', {user, medicalRecord, totalPages, currentPage: page });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
};

const viewRecords = async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);
    
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }

        // Query the MedicalRecord collection to find the specific record
        const medicalRecord = await MedicalRecord.findOne({ user_id: uID});

        // Pagination for Medical Records
        const page = parseInt(req.query.page) || 1;
        const perPage = 5; // Number of items per page

        // Calculate total posts and total pages
        const totalPosts = await MedicalRecord.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        // Query for medical records with pagination
        const medicalRecords = await MedicalRecord.find({ user_id: user })
            .sort({ date: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        // Render the viewRecords page with the specific medical record and pagination data
        res.render('users/viewRecords', { user, medicalRecord, totalPages, currentPage: page, medicalRecords });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
};

const printableRecords = async (req, res) => {
    try {
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }
        // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);
    
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/registration/login');
        }
        // Query the MedicalRecord collection to find the specific record
        const medicalRecord = await MedicalRecord.findOne({ user_id: uID});

        // Render the viewRecords page with the specific medical record and pagination data
        res.render('users/printable', { user, medicalRecord });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/registration/login');
    }
   
};


const editMyProfile = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user_id && !req.session.username) {
            req.flash('error_msg', 'Please login to access the App');
            return res.redirect('/registration/login');
        }      
           // Find the user by user_id
        const uID = req.session.user_id;
        const user = await User.findById(uID);
    
         if (!user) {
             req.flash('error_msg', 'User not found');
             return res.redirect('/registration/login');
         }
    
        res.render('users/editMyProfile', { user  });
    } catch (err) {
        req.flash('error_msg', err);
        res.redirect('/users/welcome');
    }    
};

//IF WE WANT OUR IMAGES TO GO INTO DIFFERENT FOLDER
let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/patientImage/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now())
    }
});

const upl = multer({ storage: storage });

const editMyProfilePost = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user_id && !req.session.username) {
           req.flash('error_msg', 'Please login to access the App');
           return res.redirect('/registration/login');
       }
       
        const uID = req.session.user_id;
        const user = await User.findById(uID);
    
       if (!user) {
           req.flash('error_msg', 'User not found');
           return res.redirect('/registration/login');
       }
       
       const { name, username, email, gender, dob, number,address, city, state, password, occupation, bloodGroup, genotype } = req.body;

       // Check if a new image was uploaded
       let newImage = {};
       if (req.file && req.file.filename) {
           newImage = {
               data: fs.readFileSync(path.join(__dirname, '../public/patientImage/' + req.file.filename)),
               contentType: 'image/png',
           };
       }

       // Retain the existing image or use the new image
       const userImage = req.file ? newImage : (user ? user.image : {});

       // Hash the new password if it has been changed
       let userPasswordHash;
       if (password && password !== user.password) {
           userPasswordHash = bcrypt.hashSync(password, 10);
       } else {
           // If the password hasn't changed, retain the existing hashed password
           userPasswordHash = user.password;
       }

       // Update the document with the hashed password
       await User.findByIdAndUpdate(user, {
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
            password: userPasswordHash, // Update the password only if it has changed
            occupation, 
            bloodGroup, 
            genotype,
            image: userImage,
           }
       }); 

       let msg = `
       <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
       <p>Dear   ${name} ,  We hope this message finds you well. We wanted to inform you that there has been an update to your information in our database. The details that have been modified include:</p>

       <p>New Information:</p>
       <ul>
           <li>Full Name: ${name}</li>
           <li>Username: ${username}</li>
           <li>Email Address: ${email}</li>
           <li>Gender: ${gender}</li>
           <li>DOB: ${dob}</li>
           <li>Phone Number: ${number}</li>
           <li>Home Address: ${address}</li>
           <li>City: ${city}</li>
           <li>State: ${state}</li>
           <li>Occupation: ${occupation}</li>
           <li>Blood Group : ${bloodGroup}</li>
           <li>Genotype : ${genotype}</li>
       </ul>

       <p>Please review the changes to ensure that they accurately reflect your information. If you believe any information is incorrect or if you have any questions regarding the update, please don't hesitate to reach out to our administrative team at +2347033731378 or ibrahim4grace@gmail.com.</p>

       <p>We value your continued association with us, and it's important to us that your records are kept up-to-date for your convenience and our records.</p>

       <p>Thank you for your prompt attention to this matter. We appreciate your trust in our services and are here to assist you with any further inquiries you may have..</p>

       <p>Best regards,<br>
       The Korex Logistic Team </p>`;

                
       const mailOptions = {
           from: process.env.NODEMAILER_EMAIL,
           to: email,
           subject: 'Information Update Confirmation',
           html: msg,
           attachments: [
               {
                   filename: 'companyLogo.jpg',
                   path: './public/img/companyLogo.jpg',
                   cid: 'companyLogo'
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
       res.redirect('/users/welcome');
   } catch (error) {
       console.error('Error updating admin:', error);
       req.flash('error_msg', 'An error occurred while updating user information.');
       res.redirect('/users/welcome');
   }  
};

//USER LOGOUT 
const userLogout = (req, res) =>{
// Destroy the user's session
req.session.destroy((err) => {
    if (err) {
        console.error('Session destruction error:', err);
    }
    res.redirect('/');
});
};


module.exports = ({
    userLandingPage,bookAppointment,bookAppointmentPost,appointmentHistory,readMore,editPatientAppointment,editPatientAppointmentPost,
    deleteApointments,medicalRecord,viewRecords,printableRecords,editMyProfile,upl,editMyProfilePost,userLogout
});


