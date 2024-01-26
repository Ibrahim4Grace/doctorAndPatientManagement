const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { Doctors, DoctorPayment } = require('../models/doctors');
const {checkAuthenticated, checkNotAuthenticated} = require ('../middleware/authentication');


router.get('/api/doctors',checkAuthenticated, async (req, res) => {
    try {
        // Retrieve the list of doctors from your database using await
        const doctors = await Doctors.find({}, 'flname email specialty');

        // Send the list of doctors as JSON
        res.json(doctors);
    } catch (error) {
        console.error("Error fetching doctor data:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/generate-pdf', checkNotAuthenticated, (req, res) => {
    const { date, diagnosis, treatment } = req.query;
  
    // Create a new PDF document
    const doc = new PDFDocument();
  
    // Pipe the PDF to the response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent('generated-pdf.pdf')}`);
    doc.pipe(res);
  
    // Add content to the PDF using the provided data
    doc.text(`Date: ${date}`);
    doc.text(`Diagnosis: ${diagnosis}`);
    doc.text(`Treatment: ${treatment}`);
  
    // End the PDF document
    doc.end();
  });


module.exports = router;



