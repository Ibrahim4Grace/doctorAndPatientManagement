const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const  User  = require('../models/User');
const  notRegistered  = require('../models/unregis_patient');
const Admin = require('../models/admin');

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

const registrationPagePost = async (req, res) => {
    const { name, email, username, number, address, city, state, password, password2 } = req.body;
    let errors = [];

    // Check required fields
    if (!name || !email || !username || !number || !address || !city || !state  || !password || !password2) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    // Check passwords match
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    // Check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    // If all checks complete
    if (errors.length > 0) {
        res.render('registration/register', {
            errors,
            name,
            email,
            username,
            number,
            address,
            city,
            state,
            password,
            password2
        });
    } else {
        try {
            // Check if the email or username is already registered in the notRegistered table
            const notRegisteredUserExists = await notRegistered.findOne({ $or: [{ email }, { username }] });

            if (notRegisteredUserExists) {
                errors.push({ msg: 'Email or username already registered' });

                // Render the registration page with errors
                return res.render('registration/register', {
                    errors,
                    name,
                    email,
                    username,
                    number,
                    address,
                    city,
                    state,
                    password,
                    password2,
                });
            }

            // Check if the email or username is already registered in the admin table
            const adminUserExists = await Admin.findOne({ $or: [{ adminEmail: email }, { adminUsername: username }] });

            if (adminUserExists) {
                errors.push({ msg: 'Email or username already registered' });

                // Render the registration page with errors
                return res.render('registration/register', {
                    errors,
                    name,
                    email,
                    username,
                    number,
                    address,
                    city,
                    state,
                    password,
                    password2,
                });
            }

            // Check if the email or username is already registered in the User table
            const registeredUserExists = await User.findOne({ $or: [{ email }, { username }] });

            if (registeredUserExists) {
                errors.push({ msg: 'Email or username already registered' });

                // Render the registration page with errors
                return res.render('registration/register', {
                    errors,
                    name,
                    email,
                    username,
                    number,
                    address,
                    city,
                    state,
                    password,
                    password2,
                });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            // Create a new user in the notRegister table
            const newUser = new notRegistered({
                name,
                email,
                username,
                number,
                address,
                city,
                state,
                password: hashedPassword,
            });

            // Save the user to the notRegister table
            await newUser.save();

            let phoneNumber = process.env.HOSPITAL_Number;
                  let emailAddress = process.env.HOSPITAL_EMAIL;
          
                  let msg = `
                  <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
                  <p>Dear ${name}, We are writing to confirm your pending registration with Korex Hospital. We are thrilled to have you as a part of our healthcare family. Your well-being is our top priority. Please review the following details of your registration.</p>
                 
                        <p>Registration Information:</p>
                  <ul>
                      <li>Full Name: ${name}</li>
                       <li>Email: ${email}</li>
                       <li>Username: ${username}</li>
                      <li>Home Address: ${address}</li>
                      <li>City: ${city}</li>
                      <li>State: ${state}</li>
                      <li>Phone Number: ${number}</li>
                  </ul>
              
                  <p>kindly contact us to complete your registration. If you did not register with Korex Hospital or have any concerns about this registration confirmation, please do not hesitate to contact us immediately. Your security and privacy are essential to us, and we want to ensure that your information is accurate. Futhermore, Kindly contact us to activate your registration for you to be able to access your online portal.</p>
                  
                  <p>Our team is here to assist you and answer any questions you may have. Feel free to reach out to our customer service department at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
                 
                  <p>Once again, thank you for choosing Korex Hospital. We are committed to providing you with the highest quality healthcare services and support.</p>
              
              
                  <p>Best regards,<br>
                  The Korex Hospital Team</p>`;

              const mailOptions = {
                  from: process.env.NODEMAILER_EMAIL,
                  to: email,
                  subject: 'Confirmation of Your Registration with Korex Hospital',
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

            req.flash('success_msg', 'You are now registered. Please log in.');
            res.redirect('/registration/login');
        } catch (error) {
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
    registrationPage,registrationPagePost, userLoginPage,userLoginPagePost,forgetPassword,forgetPasswordPost,resetPasswordToken,resetPasswordPost

});




