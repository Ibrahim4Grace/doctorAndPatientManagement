const express = require('express');
const router = express.Router();
const {checkAuthenticated, checkNotAuthenticated} = require ('../middleware/authentication');

const { landingPage,departmentPage,needHelpPage,testimonyPage,aboutUsPage,ourDoctorsPage,appointmentPage,appointmentPagePost,
    contactusPage,contactusPagePost
} = require('../controller/frontendController');


router.get('/', checkNotAuthenticated, landingPage);
router.get('/department', checkNotAuthenticated, departmentPage);
router.get('/need-help', checkNotAuthenticated, needHelpPage);
router.get('/testimony', checkNotAuthenticated, testimonyPage);
router.get('/aboutus', checkNotAuthenticated, aboutUsPage);
router.get('/ourdoctors', checkNotAuthenticated, ourDoctorsPage);
router.get('/appointment', checkNotAuthenticated, appointmentPage);
router.post('/appointmentPagePost', checkNotAuthenticated, appointmentPagePost);
router.get('/contactus', checkNotAuthenticated, contactusPage);
router.post('/contactusPagePost', checkNotAuthenticated, contactusPagePost);




module.exports = router;
