const express = require('express');
const router = express.Router();
const {checkAuthenticated, checkNotAuthenticated} = require ('../middleware/authentication');

const {
  registrationPage,upl,registrationPagePost, userLoginPage,userLoginPagePost,forgetPassword,forgetPasswordPost,resetPasswordToken,resetPasswordPost

} = require('../controller/loginController');

router.get('/register', checkNotAuthenticated, registrationPage);
router.post('/registrationPagePost', checkNotAuthenticated, upl.single('image'), registrationPagePost);
router.get('/login', checkNotAuthenticated, userLoginPage);
router.post('/userLoginPagePost', checkNotAuthenticated, userLoginPagePost);
router.get('/forgetPassword', checkNotAuthenticated, forgetPassword);
router.post('/forgetPasswordPost', checkNotAuthenticated, forgetPasswordPost);
router.get('/resetPassword/:id/:token', checkNotAuthenticated, resetPasswordToken);
router.post('/resetPasswordPost/:id/:token', checkNotAuthenticated, resetPasswordPost);


module.exports = router;

