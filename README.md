WELCOME TO MY Doctor Management System
The Doctor Management System is a web application designed for managing doctors' information and appointments at a medical institution, specifically designed for Korex Hospital. This system helps in organizing, updating, and retrieving doctor-related data efficiently. It also provides a platform for patients to schedule appointments with their doctors.

Features

1. User Authentication
   Admin Authentication: Only authorized administrators can access the admin dashboard.
   Password Hashing: User passwords are securely hashed before storing them in the database for enhanced security.

2. Admin Dashboard
   Doctor Management: Admins can view, edit, and manage doctor information.
   Appointment Management: Admins can manage patient appointments, including viewing, updating, and scheduling new appointments.
   User Management: Admins can manage users' accounts, including doctor and patient accounts.

3. Doctor Profile
   Detailed Information: Doctors can provide detailed information about themselves, including their full name, contact details, gender, specialty, date of birth, and social media links.
   Password Security: Passwords are securely hashed for doctor accounts.

4. Patient Appointments
   Appointment Scheduling: Patients can schedule appointments with their doctors through the system.
   Appointment Listing: Doctors and administrators can view a list of upcoming patient appointments.
   Confirmation Emails: Automated confirmation emails are sent to patients after booking an appointment.

5. Responsive Design
   The website is designed to be responsive, ensuring that it works seamlessly on both desktop and mobile devices.

   Technologies Used
   Node.js: The backend is built using Node.js, which provides the server environment.
   Express.js: The web application framework for Node.js used to handle routes and requests.
   MongoDB: The NoSQL database used to store data related to doctors, appointments, and users.
   Passport.js: Used for user authentication.
   Bcrypt.js: Used to securely hash passwords before storing them in the database.
   Nodemailer: Used to send confirmation emails to patients.
   EJS (Embedded JavaScript): The templating engine used to generate dynamic web pages.
