const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const  User  = require('../models/User');
const fs = require('fs');
const path = require('path');
const multer = require('multer');


 //Login attempts Limit 
 const MAX_FAILED_ATTEMPTS = process.env.MAX_FAILED_ATTEMPTS;
 
// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: process.env.MAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});


//USER REGISTRATION SECTION
const registrationPage = (req, res) => {
    res.render(`registration/register`);  
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

const registrationPagePost = async (req, res) => {
  
    const { name, username, email, gender, dob, number, address, city, state, password, password2, occupation, bloodGroup } = req.body;
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
            res.render('registration/register', {
                errors, name,  username,
                email, gender, dob,
                number,  address,city,
                state, password, password2,
                occupation, bloodGroup,
            });
    
        } else {
    
            try {
               // Check if the email nd username is already registered in the User table
               const registeredUserExists = await User.findOne({ $or: [{ email }, { username }]  });
    
               if (registeredUserExists) {
                   errors.push({ msg: 'Email or username already registered' });

                   // Render the registration page with errors
                   res.render('registration/register', {
                       errors,name,username,
                       email, gender, dob,
                       number,address, city,
                       state,password, password2,
                       occupation, bloodGroup,
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
                            bloodGroup,
                            patientID: newPatientID, // Assign the generated patient ID
                            image: {
                                data: fs.readFileSync(path.join(__dirname, '../public/patientImage/' + req.file.filename)),
                                contentType: 'image/png'
                            },
                        });
                        await newUser.save();

                        let phoneNumber = process.env.HOSPITAL_Number;
                        let emailAddress = process.env.HOSPITAL_EMAIL;

                        let msg = `
                        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 600px; height: auto;"/></p><br>
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
                        req.flash('success_msg', 'Patient successfully registered.');
                        res.redirect('/registration/login');
                }
            } catch (error) {
                // Handle any unexpected errors
                console.error('Registration error:', error);
                req.flash('error_msg', 'There was a problem with registration.');
                res.redirect('/registration/register');
            }
        }
};

//USER LOGIN SECTION
const userLoginPage = (req, res) => {
    res.render('registration/login');  
};


const userLoginPagePost = (req, res) => {

        const { username, password } = req.body;
    
        User.findOne({ username })
            .then((user) => {
                if (!user) {
                    req.flash('error_msg', 'Invalid Username');
                    return res.redirect('/registration/login');
                }
    
                if (user.accountLocked) {
                    req.flash('error_msg', 'Account locked. Contact Korex for assistance.');
                    return res.redirect('/registration/login');
                }
    
                bcrypt.compare(password, user.password, (err, isVerified) => {
                    if (err) {
                        console.error('bcrypt.compare error:', err);
                        req.flash('error_msg', 'Invalid Password');
                        return res.redirect('/registration/login');
                    }
    
                    if (isVerified) {
                        // Successful login - reset failed login attempts
                        User.updateOne({ username }, { $set: { failedLoginAttempts: 0 } })
                            .then(() => {
                                // Set session variables and redirect
                                req.session.user_id = user._id;
                                req.session.username = user.username;
                                console.log('Session User ID:', req.session.user_id);
                                console.log('Session Username:', req.session.username);
    
                                res.redirect('/users/welcome');
                            })
                            .catch((err) => {
                                console.error('Failed to update failed login attempts:', err);
                                req.flash('error_msg', 'Failed to update login attempts');
                                res.redirect('/registration/login');
                            });
                    } else {
                        // Update failed login attempts
                        User.updateOne({ username }, { $inc: { failedLoginAttempts: 1 } })
                            .then(() => {
                                // Check if the account should be locked
                                User.findOne({ username })
                                    .then((updatedUser) => {
                                        if (updatedUser.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                                            // Lock the account
                                            User.updateOne({ username }, { $set: { accountLocked: true } })
                                                .then(() => {
                                                    req.flash('error_msg', 'Account locked. Contact Korex hospital for assistance or reset Password.');
                                                    res.redirect('/registration/login');
                                                })
                                                .catch((err) => {
                                                    console.error('Failed to lock account:', err);
                                                    req.flash('error_msg', 'Failed to lock account');
                                                    res.redirect('/registration/login');
                                                });
                                        } else {
                                            req.flash('error_msg', 'Invalid Password');
                                            res.redirect('/registration/login');
                                        }
                                    })
                                    .catch((err) => {
                                        console.error('Failed to check failed login attempts:', err);
                                        req.flash('error_msg', 'Failed to check login attempts');
                                        res.redirect('/registration/login');
                                    });
                            })
                            .catch((err) => {
                                console.error('Failed to update failed login attempts:', err);
                                req.flash('error_msg', 'Failed to update login attempts');
                                res.redirect('/registration/login');
                            });
                    }
                });
            })
            .catch((err) => {
                console.error('Database error:', err);
                req.flash('error_msg', 'There was a Problem Selecting From the DB');
                res.redirect('/registration/login');
            });
};

          //FORGET PASSWORD SECTION
const forgetPassword = (req, res) => {
    res.render('registration/forgetPassword') 
};

const forgetPasswordPost = async (req, res) => {

       const {  name, email} = req.body;
       let errors = [];
       
   
       if ( !name || !email  ) {
           req.flash('error', 'Please fill all fields');
           return res.redirect('registration/forgetPassword');
       }
       try {
                 // Check if the email is already registered in the User table
                 const user = await User.findOne({ email });
 
                 if (!user) {
                    // For security reasons, you might want to provide a generic error message like "Password recovery email sent" even if the email doesn't exist in your records.
                     errors.push({ msg: 'Password recovery email sent' });
                     res.render('registration/forgetPassword', {
                         errors,
                         name ,
                         email   
                     });
                 } else {
                     const secret = process.env.JWT_SECRET + user.password;
                   
                     const payload = {
                         email: user.email,
                         id: user.id
                     };
         
                     const token = jwt.sign(payload, secret, { expiresIn: process.env.TOKEN_EXPIRATION_TIME  });
                     const host = process.env.BASE_URL || 'http://localhost:2100';
                     const link = `${host}/registration/resetPassword/${user.id}/${token}`;


                     const msg = `
                     <<p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
                     <p>Dear ${name},We are writing to confirm your password recovery with Korex Hospital.</p>
		
                     <p>Reset your password here: <a href="${link}">Click here to reset your password</a>.</p>
   
                     <p>Best regards,<br>
                     The Korex Hospital Team</p>`;
              
                     const mailOptions = {
                        from: process.env.NODEMAILER_EMAIL,
                         to: email,
                         subject: 'Recover your password with Korex Hospital',
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
                    
               req.flash('success_msg', 'Kindly check your email to reset your password.');
               res.redirect('/registration/login'); 
             }
         }catch(err) {
             console.error('Error:', err.message);
             res.redirect('/registration/forgetPassword'); 
         }
};

const resetPasswordToken = async (req, res) => {
    const { id, token } = req.params;
    let errors = [];
    let userFound;

    try {
        userFound = await User.findById(id);

        // check if this id exists in the db
        if (!userFound) {
            errors.push({ msg: 'Invalid id...' });
            return res.render('registration/forgetPassword', { errors, email: '' });
        }

        const secret = process.env.JWT_SECRET + userFound.password;

        try {
            const payload = jwt.verify(token, secret);

            // If the token is valid, render the reset password view
            res.render('registration/resetPassword', { id, token, email: userFound.email });
        } catch (error) {
            console.error('Error:', error.message);

            if (error.name === 'TokenExpiredError') {
                // Redirect the user to a page for expired links
                return res.status(400).render('registration/forgetPassword', {
                    errors: [{ msg: 'The password reset link has expired. Please request a new one.' }],
                    email: ''
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(400).render('registration/forgetPassword', {
                    errors: [{ msg: 'Invalid token. Please make sure the link is correct.' }],
                    email: ''
                });
            } else {
                // Handle other errors as needed
                return res.status(500).render('registration/forgetPassword', {
                    errors: [{ msg: 'Error resetting password. Please try again.' }],
                    email: ''
                });
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).render('registration/forgetPassword', {
            errors: [{ msg: 'Error resetting password. Please try again.' }],
            email: ''
        });
    }
};


const resetPasswordPost = async (req, res) => {
    const { id, token } = req.params;
    const { password, password2 } = req.body;
    let errors = [];
    let userFound;  // Declare user variable outside the try block

    try {
        userFound = await User.findById(id);

        // check if this id exists in the db
        if (!userFound) {
            errors.push({ msg: 'Invalid id...' });
            return res.render('registration/resetPassword', {
                errors,
                email: ''
            });
        }

        // check passwords match
        if (password !== password2) {
            errors.push({ msg: 'Passwords do not match' });
        }

        // Check password length
        if (password.length < 6) {
            errors.push({ msg: 'Password should be at least 6 characters' });
        }

        const secret = process.env.JWT_SECRET + userFound.password;

        const payload = jwt.verify(token, secret);

        // Hash the new password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        userFound.password = hashedPassword;

        // Reset lock properties
        userFound.failedLoginAttempts = 0;
        userFound.accountLocked = false;

        // Save the user object to persist the changes
        await userFound.save();

        // Send password change notification
        let phoneNumber = process.env.HOSPITAL_Number;
        let emailAddress = process.env.HOSPITAL_EMAIL;

        let msg = `
        <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
        <p>Dear ${userFound.name}, We hope this message finds you well. We wanted to inform you about a recent update regarding your password.</p>
    
        <p>If you didn't make this change, kindly contact our department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
       
        <p>We appreciate your continued dedication and patronization to our healthcare team. Thank you for choosing to be a part of Korex Hospital.</p>
    
        <p>Best regards,<br>
        The Korex Hospital Team</p>`;

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: userFound.email,
            subject: 'Password Changed Confirmation',
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

        req.flash('success_msg', 'Password Successfully Updated. Please Login');
        res.redirect('/registration/login');
    } catch (error) {
        console.log(error.message);
        req.flash('error_msg', 'Error updating password. Please try again.');
        res.render('registration/resetPassword', { errors, email: userFound ? userFound.email : '' });
    }
};

module.exports = ({
    registrationPage,upl,registrationPagePost, userLoginPage,userLoginPagePost,forgetPassword,forgetPasswordPost,resetPasswordToken,resetPasswordPost

});




