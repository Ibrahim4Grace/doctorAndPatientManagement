if (process.env.NODE_ENV !== 'production'){
  require('dotenv').config()
}

const express = require(`express`)
const mongoose = require(`mongoose`)
const ejs = require(`ejs`)
const flash = require('connect-flash');
const passport = require("passport")
const session = require(`express-session`)
const methodOverride = require('method-override');
const morgan = require('morgan');
const connectToMongoDB = require('./database/conn'); 
const port = process.env.PORT 
const app = express();




// Connect to MongoDB using this method because it returns a promise
connectToMongoDB()
  .then(() => {
    // Start the server after MongoDB connection is established
    app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Unable to start the server:', err.message);
  });
  
// TO CALL OUR EJS
app.set(`view engine`, `ejs`);

//TO BE ABLE TO ACCESS OUR STATIC FILES -- IMG, CSS, VIDEOS
app.use(express.static(`public`))
app.use(express.urlencoded({ extended: false }));



app.use(session({
  secret: process.env.SESSION_SECRET,
  // means do you want to resave session iF nothing changes
  resave: false,
   //save empty value in the session
   saveUninitialized: false  
}));

     //creating global variable for color changing
app.use(flash())
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});


//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(morgan('tiny'));
app.disable('x-powered-by'); //less hacker know about our stack




//ROUTES
app.use(`/`, require(`./controller/frontend`));
app.use(`/`, require(`./controller/frontendTwo`));
app.use(`/`, require(`./route/log`));
app.use(`/`, require(`./controller/backendTwo`));
app.use(`/`, require(`./controller/backend`));


