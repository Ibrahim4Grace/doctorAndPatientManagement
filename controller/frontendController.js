const express = require(`express`)
const router = express.Router();
const nodemailer = require(`nodemailer`);
const { Appointment, Contact } = require('../models/appointment');
const { Doctors, DoctorPayment } = require('../models/doctors');


// Send email to the applicant
const transporter = nodemailer.createTransport({
    service: process.env.MAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});

const landingPage = async (req, res) => {
    const ourDoctors = await Doctors.find();
    res.render(`index`, { ourDoctors });
};

const departmentPage = (req, res) => {
    res.render(`department`);   
};

const needHelpPage = (req, res) => {
    res.render(`need-help`);
};

const testimonyPage = (req, res) => {
    res.render(`testimony`);  
};

const aboutUsPage = (req, res) => {
    res.render(`aboutus`);
};

const ourDoctorsPage = async (req, res) => {
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
};

const appointmentPage = (req, res) => {
    res.render(`appointment`); 
};

const appointmentPagePost =  (req, res) => {
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

    
     try {
         newAppointment.save();
       
         let phoneNumber = process.env.HOSPITAL_Number;
         let emailAddress = process.env.HOSPITAL_EMAIL;
 
         let msg = `
         <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
         <p>Dear ${flname},  we are pleased to inform you that your appointment with Korex Hospital has been successfully scheduled. Below are the details of your appointment.</p>
     
        
          <p>Appointment Information:</p>
         <ul>
              <li>Full Name: ${flname}</li>
              <li>Department: ${department}</li>
              <li>Phone Number: ${number}</li>
              <li>Scheduled Appointment Date: ${date}</li>
         </ul>
         
         <p>Please arrive at least 15 minutes before your scheduled appointment time. If you have any changes or need to reschedule, please contact us at least 24 hours in advance.</p> 
         
         <p> We look forward to providing you with excellent healthcare services. If you have any questions or need further assistance, feel free to reach out to our customer service team. at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
        
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
         // res.send(`Movie Successfully saved into DB`);
         req.flash('success_msg', 'Appointment Successfully Booked');
         res.redirect('/appointment');
     } catch (err) {
         console.error(err);
         req.flash('error', 'An error occurred while booking the appointment');
         res.redirect('/appointment');
     }
 }

};

const contactusPage = (req, res) => {
    res.render(`contactus`); 
};

const contactusPagePost = (req, res) => {
    
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

         try {
             newContact.save();
        
             
             let phoneNumber = process.env.HOSPITAL_Number;
             let emailAddress = process.env.HOSPITAL_EMAIL;
     
             let msg = `
             <p><img src="cid:Creat" alt="Company Logo" style="width: 100%; max-width: 500px; height: auto;"/></p><br>
             <p>Dear ${fname}, We appreciate your interest and will get back to you as soon as possible..</p>
         
             <p>In the meantime, if you have any urgent matters or questions, feel free to contact us directly at <a href="tel:${phoneNumber}">${phoneNumber}</a> or <a href="mailto:${emailAddress}">${emailAddress}</a>. Your satisfaction is important to us, and we are here to assist you</p>
            
             <p>Thank you for choosing Korex Hospital for your medical needs.</p>
         
             <p>Best regards,<br>
             The Korex Hospital Team</p>`;
 
 
             const mailOptions = {
                from: process.env.NODEMAILER_EMAIL,
                 to: email,
                 subject: 'Thank you for reaching out to us!',
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
             // res.send(`Movie Successfully saved into DB`);
             req.flash('success_msg', 'Message successfully sent.');
             res.redirect('/contactus');
         } catch (err) {
             console.error(err);
             req.flash('error', 'An error occurred while sending your message');
             res.redirect('/contactus');
 
         }
     } 
};

module.exports = ({
    landingPage,departmentPage,needHelpPage,testimonyPage,aboutUsPage,ourDoctorsPage,appointmentPage,appointmentPagePost,
    contactusPage,contactusPagePost

});




