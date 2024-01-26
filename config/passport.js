
const localStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin'); 


module.exports = (passport) => {

  passport.use('local-admin', new localStrategy({
    usernameField: 'adminUsername',
    passwordField: 'adminPassword',
    passReqToCallback: true
}, async (req, adminUsername, adminPassword, done) => {
    const adminRole = req.body.adminRole;

    try {
        // Find the admin by username
        const admin = await Admin.findOne({ adminUsername: adminUsername });

        if (!admin) {
          console.log('Admin not found');
            return done(null, false, { message: 'Username not found' });
        }

        // Compare the provided password with the hashed password
        const passwordMatch = await bcrypt.compare(adminPassword, admin.adminPassword);

        if (!passwordMatch) {
            return done(null, false, { message: 'Password incorrect' });
        }

        // Check if the role matches
        if (admin.adminRole !== adminRole) {
            return done(null, false, { message: 'Role incorrect' });
        }

        return done(null, admin);
    } catch (error) {
      console.log('Error:', error);
        return done(error);
    }
}));


  passport.serializeUser((admin, done) => {
    done(null, admin.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const admin = await Admin.findById(id);
      done(null, admin);
    } catch (error) {
      done(error);
    }
  });

  
  return passport;
};



