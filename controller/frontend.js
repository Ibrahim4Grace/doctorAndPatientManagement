const express = require(`express`)
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require(`nodemailer`);
const jwt = require('jsonwebtoken');
const ejs = require(`ejs`);


const app = express();

const notRegistered = require('../models/unregis_patient');
const User = require('../models/User');
const { Appointment, Contact } = require('../models/appointment');
const { Doctors, DoctorPayment } = require('../models/doctors');


// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: 'gmail',
    // host: 'smtp.gmail.com',
    // port: 587,
    // secure: false,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});



router.get(`/`, checkNotAuthenticated, async(req, res) => {

    const ourDoctors = await Doctors.find();

    res.render(`index`, { ourDoctors });
});

router.get(`/department`, checkNotAuthenticated, (req, res) => {

    res.render(`department`);
});


router.get(`/need-help`, checkNotAuthenticated, (req, res) => {

    res.render(`need-help`);
});

router.get(`/testimony`, checkNotAuthenticated, (req, res) => {

    res.render(`testimony`);
});

router.get(`/aboutus`, checkNotAuthenticated, (req, res) => {

    res.render(`aboutus`);
});

router.get(`/ourdoctors`, checkNotAuthenticated, async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 8; // Number of items per page
        const totalPosts = await Doctors.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        const ourDoctors = await Doctors.find()
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('ourdoctors', { ourDoctors, totalPages, currentPage: page });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});



router.get(`/registration/register`, checkNotAuthenticated, (req, res) => {

    res.render(`registration/register`);
});


//register handle
router.post('/registration/register', checkNotAuthenticated, async(req, res) => {
    const { name, email, number, address, password, password2 } = req.body;
    let errors = [];

    //check required fields
    if (!name || !email || !number || !address || !password || !password2) {
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
        res.render('registration/register', {
            errors,
            name,
            email,
            number,
            address,
            password,
            password2
            
        });

    } else {

        try {
            // Check if the email is already registered in the notRegister table
            const notRegisteredUserExists = await notRegistered.findOne({ email });

            if (notRegisteredUserExists) {
                errors.push({ msg: 'Email already registered' });

                // Render the registration page with errors
                res.render('registration/register', {
                    errors,
                    name,
                    email,
                    number,
                    address,
                    password,
                    password2,
                });
            } else {
                // Check if the email is already registered in the User table
                const registeredUserExists = await User.findOne({ email });

                if (registeredUserExists) {
                    errors.push({ msg: 'Email already registered' });

                    // Render the registration page with errors
                    res.render('registration/register', {
                        errors,
                        name,
                        email,
                        number,
                        address,
                        password,
                        password2,
                    });
                } else {
                    // Hash the password
                    const hashedPassword = await bcrypt.hash(password, 10);

                    // Create a new user in the notRegister table
                    const newUser = new notRegistered({
                        name,
                        email,
                        number,
                        address,
                        password: hashedPassword,
                    });

                    // Save the user to the notRegister table
                    await newUser.save();
                    let msg =
                    'Dear ' + name + ", We are writing to confirm your pending registration with Korex Hospital. We are thrilled to have you as a part of our healthcare family. Your well-being is our top priority. Please review the following details of your registration:\n\n" +
                    "Full Name: " + name + "\n" +
                    "Email Address: " + email + "\n" +
                    "Home Address: " + address + "\n" +
                    "Contact Number: " + number + "\n\n" +
                    "kindly contact us to complete your registration.. If you did not register with Korex Hospital or have any concerns about this registration confirmation, please do not hesitate to contact us immediately. Your security and privacy are essential to us, and we want to ensure that your information is accurate. Futhermore, Kindly contact us to activate your registration for you to be able to access your online portal.\n\n" +
                    "Our team is here to assist you and answer any questions you may have. Feel free to reach out to our customer service department at +2347033731378 or ibrahim4grace@gmail.com.\n\n" +
                    "Once again, thank you for choosing Korex Hospital. We are committed to providing you with the highest quality healthcare services and support.\n\n" +
                    "Best regards,\n\n" +
                    "Korex Hospital";

                const mailOptions = {
                    from: 'ibro4grace@gmail.com',
                    to: email,
                    subject: 'Confirmation of Your Registration with Korex Hospital',
                    text: msg,
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Email sending error:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });

                    // Set success flash message
                    req.flash('success_msg', 'You are now registered. Please log in.');

                    // Redirect to the login page
                    res.redirect('/registration/login'); 
                }
            }
        } catch (error) {
            // Handle errors, log to the console, and set an error flash message
            console.error('Registration error:', error);
            req.flash('error_msg', 'There was a problem with registration.');
            res.redirect('/registration/register');
        }
        
    }


});


      //FORGET PASSWORD SECTION
router.get('/registration/forgetPassword', (req, res) =>{

    res.render('registration/forgetPassword')

});

router.post('/forgetPassword', async(req, res) =>{

      // Using data destructuring
      const {  name, email} = req.body;
      let errors = [];
  
      // Check required fields
      if ( !name || !email  ) {
          req.flash('error', 'Please fill all fields');
        
          return res.redirect('registration/forgetPassword');
      }
      try {

                // Check if the email is already registered in the User table
                const user = await User.findOne({ email });

                if (!user) {
                    errors.push({ msg: 'Email not found in our records' });
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
        
                    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
                    const link = `http://localhost:2100/registration/resetPassword/${user.id}/${token}`;

                    const msg =
                    `Dear ${name},\n\n` +
                    `We are writing to confirm your password recovery with Korex Hospital.\n\n` +
                    `Reset your password here: <a href="${link}">Click here to reset your password</a>\n\n` +
                    `Best regards,\n\n` +
                    `Korex Hospital`;
             

                    const mailOptions = {
                        from: 'ibro4grace@gmail.com',
                        to: email,
                        subject: 'Recover your password with Korex Hospital',
                        html: msg,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log('Email sending error:', error);
                        } else {
                            console.log('Email sent:', info.response);
                        }
                    });
                    console.log(link)
              // Set success flash message
              req.flash('success_msg', 'Link has been sent to your email. Kindly check your email to reset your password.');
              res.redirect('/registration/login'); 
       
       
            }
        }catch(err) {
            console.error('Error:', err.message);
            res.redirect('/registration/forgetPassword'); 
        }
});
router.get('/registration/resetPassword/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    let errors = [];
    let user;

    try {
        const user = await User.findById(id);

        // check if this id exists in the db
        if (!user) {
            errors.push({ msg: 'Invalid id...' });
            return res.render('registration/resetPassword', { errors, email: '' });
        }

        const secret = process.env.JWT_SECRET + user.password;

        const payload = jwt.verify(token, secret);

        // If the token is valid, render the reset password view
        res.render('registration/resetPassword', { id, token, email: user.email });
    } catch (error) {
        console.error('Error:', error.message);

        // Check if the error is due to token expiration
        if (error.name === 'TokenExpiredError') {
            // Redirect the user to a page for expired links
            return res.redirect('/registration/passwordResetExpired');
        } else {
            // Handle other errors as needed
            errors.push({ msg: 'Error resetting password. Please try again.' });
            return res.render('registration/forgetPassword', { id, token, email: user ? user.email : '' });
        }
    }
});


router.post('/resetPassword/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password, password2 } = req.body;
    let errors = [];
    let user;  // Declare user variable outside the try block

    try {
        user = await User.findById(id);

        // check if this id exists in the db
        if (!user) {
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

        const secret = process.env.JWT_SECRET + user.password;

        const payload = jwt.verify(token, secret);

        // Hash the new password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;

        // Save the user object to persist the changes
        await user.save();

        // Send password change notification
        const msg =
            'Dear ' + user.name + ',\n\n' +
            'We hope this message finds you well. We wanted to inform you about a recent update regarding your password.\n\n' +
            "If you didn't make this change, kindly contact our department at 2347033731378. We're here to assist you.\n\n" +
            'We appreciate your continued dedication and patronization to our healthcare team. Thank you for choosing to be a part of Korex Hospital...\n\n' +
            'Warm regards,\n' +
            'Korex Hospital';

        const mailOptions = {
            from: 'ibro4grace@gmail.com',
            to: user.email,
            subject: 'Password Changed Confirmation',
            text: msg,
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
        res.render('registration/resetPassword', { errors, email: user ? user.email : '' });
    }
});




// Add a route for expired password reset links
router.get('/registration/passwordResetExpired', (req, res) => {
    res.render('registration/passwordResetExpired');
});



router.get(`/appointment`, checkNotAuthenticated, (req, res) => {

    res.render(`appointment`);
});

router.post(`/appointment`, checkNotAuthenticated, (req, res) => {
    // USING DATA destructuring
    const { flname, email, department, date, textarea, number, disease, newDate } = req.body;

          // Get the user's ObjectId from the session (assuming you have the user's ObjectId in req.session.user_id)
         const userId = req.session.user_id;

    //check required fields
    if (!flname || !email || !department || !date || !textarea || !number) {
        req.flash(`error`, `Please fill all fields`);
        res.redirect(`/appointment`);
    } else {

        const newAppointment = new Appointment({

            flname,
            email,
            department,
            date,
            number,
            textarea,
            user: userId, // Associate the appointment with the user's ObjectId
        });

        //TO SAVE INTO DATABASE INPUT
        try {
            newAppointment.save();
            let msg =
                'Dear ' + flname + ", we are pleased to inform you that your appointment with Korex Hospital has been successfully scheduled. Below are the details of your appointment:\n\n" +
                "Full Name: " + flname + "\n" +
                "Department: " + department + "\n" +
                "Phone Number: " + number + "\n" +
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
            // res.send(`Movie Successfully saved into DB`);
            req.flash('success_msg', 'Appointment Successfully Booked');
            res.redirect('/appointment');
        } catch (err) {
            console.log(err);
            req.flash('error', 'An error occurred while booking the appointment');
            res.redirect('/appointment');

        }
    }


})

router.get(`/contactus`, checkNotAuthenticated, (req, res) => {

    res.render(`contactus`);
});

router.post(`/contact`, checkNotAuthenticated, (req, res) => {
    // USING DATA destructuring
    const { fname, email, pn, visitb, topic, mesg } = req.body;


    //check required fields
    if (!fname || !email || !pn || !visitb || !topic || !mesg) {
        req.flash(`error`, `Please fill all fields`);
        res.redirect(`/contactus`);
    } else {

        const newContact = new Contact({

            fname,
            email,
            pn,
            visitb,
            topic,
            mesg
        });

        //TO SAVE INTO DATABASE INPUT
        try {
            newContact.save();
            let msg =
                'Dear ' + fname + ",\n\n" +
                "We appreciate your interest and will get back to you as soon as possible." + "\n\n" +
                "In the meantime, if you have any urgent matters or questions, feel free to contact us directly at 2347033731378" + "\n\n" +
                "Best regards" + "\n" +
                "Korex Hospital";


            const mailOptions = {
                from: 'ibro4grace@gmail.com',
                to: email,
                subject: 'Thank you for reaching out to us!',
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
            req.flash('success_msg', 'Message successfully sent.');
            res.redirect('/contactus');
        } catch (err) {
            console.log(err);
            req.flash('error', 'An error occurred while sending your message');
            res.redirect('/contactus');

        }
    }


});



//if admin is authenticated you cant go out till you sign out
function checkNotAuthenticated(req, res,next){
    if(req.isAuthenticated()){
       return res.redirect('/dashboard')
    }
    //keeps inside dashboard
   next()
}


module.exports = router;






