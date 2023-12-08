
const express = require(`express`)
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const ejs = require(`ejs`);
const  Admin  = require('../models/admin');
const  User  = require('../models/User');



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


                                               // USER LOGGIN SECTOR

// Render the login page
router.get('/registration/login', (req, res) => {
  res.render('registration/login');
});

// Handle user login form submission
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  console.log('Password:', password);

 

  User.findOne({ email: email })
      .then((result) => {
          if (!result) {
              req.flash('error_msg', "Invalid Email");
              res.redirect('/registration/login');
          } else {
              //MEANING THAT THERE'S RESULT
              bcrypt.compare(password, result.password, (err, isVerified) => {

                  if (err) {
                    console.error('bcrypt.compare error:', err);
                      req.flash('error_msg', "Invalid Password");
                      res.redirect('/registration/login');
                  }
                  console.log('Password comparison result:', isVerified);

                  if (isVerified) {
                      //BELOW WE ESTABLISH OUR SESSION VARIABLES
                      req.session.user_id = result._id;
                      req.session.email = result.email;

                       // Log session variables
    console.log('Session User ID:', req.session.user_id);
    console.log('Session Email:', req.session.email);
                    
                       // Log to check if this line is executed
    console.log('Redirecting to /users/welcome');
                      //BELOW WE REDIRECT User INTO THE DASHBOARD PAGE
                      res.redirect('/users/welcome');
                  } else {
                      req.flash('error_msg', "Invalid Password");
                      res.redirect('/registration/login');
                  }
              })
          }
      })
      .catch((err) => {
        console.error('Database error:', err);
        req.flash('error_msg', "There was a Problem Selecting From the DB");
        res.redirect('/registration/login');
      })
    

});






                         //admin login 
// Route to render the login form
router.get('/backend/adminlogin', checkNotAuthenticated, (req, res) => {
  res.render('backend/adminlogin');
});
// Route to handle form submission
router.post('/backend/adminlogin', checkNotAuthenticated, passport.authenticate('local-admin', {
  successRedirect: '/backend/dashboard',
  failureRedirect: '/backend/adminlogin',
  failureFlash: true,
}));





//CHECKING IF ADMIN IS AUTHENTICATED WONT ALLOW YOU TO VISIT DASHBOARD IF YOU'RE NOT LOGIN
function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/backend/adminlogin');
}

//if admin is authenticated you cant go out till you sign out
function checkNotAuthenticated(req, res,next){
    if(req.isAuthenticated()){
       return res.redirect('/backend/dashboard')
    }
    //keeps inside dashboard
   next()

}

module.exports = router;


