const express = require('express');
const router = express.Router();
const {checkAuthenticated, checkNotAuthenticated} = require ('../middleware/authentication');

const {
    userLandingPage,bookAppointment,bookAppointmentPost,appointmentHistory,readMore,editPatientAppointment,editPatientAppointmentPost,
    deleteApointments,medicalRecord,viewRecords,printableRecords,editMyProfile,upl,editMyProfilePost,userLogout
} = require('../controller/userController');

router.get('/welcome', checkNotAuthenticated, userLandingPage);
router.get('/bookAppointment', checkNotAuthenticated, bookAppointment);
router.post('/bookAppointmentPost', checkNotAuthenticated, bookAppointmentPost);
router.get('/appointmentHistory', checkNotAuthenticated, appointmentHistory);
router.get('/readMore/:appointmentId', checkNotAuthenticated, readMore);
router.get('/editPatientAppointment/:appointmentId', checkNotAuthenticated, editPatientAppointment);
router.post('/editPatientAppointmentPost/:mu_id', checkNotAuthenticated, editPatientAppointmentPost);
router.get('/deleteApointments/:mu_id', checkNotAuthenticated, deleteApointments);
router.get('/medicalRecord', checkNotAuthenticated, medicalRecord);
router.get('/viewRecords/:recordId', checkNotAuthenticated, viewRecords);
router.get('/printable/:recordId', checkNotAuthenticated, printableRecords);
router.get('/editMyProfile', checkNotAuthenticated, editMyProfile);
router.post('/editMyProfilePost', checkNotAuthenticated, upl.single('image'), editMyProfilePost);
router.post('/logout', userLogout);




module.exports = router;
