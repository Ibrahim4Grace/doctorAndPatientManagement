if (process.env.NODE_ENV !== 'production'){
  require('dotenv').config()
}

const express = require(`express`)
const mongoose = require(`mongoose`)
const ejs = require(`ejs`)
const flash = require('connect-flash');
const passport = require("passport")
const session = require(`express-session`)
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const morgan = require('morgan');
const nodmon = require('nodemon');
const nodemailer = require('nodemailer');
const connectToMongoDB = require('./database/conn'); 
const doctorApiRoute = require('./route/doctorApiRoute');
const cors = require('cors');
const app = express();

// Set no-cache headers middleware
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.header('Pragma', 'no-cache');
  next();
});



const trustedOrigins = [process.env.BASE_URL];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? trustedOrigins : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
}));


// Connect to MongoDB using this method because it returns a promise
connectToMongoDB()
  .then(() => {
    // Start the server after MongoDB connection is established
    const port = process.env.PORT;
    app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Unable to start the server:', err.message);
});
  
//To store our session
const store = new MongoStore({
  mongoUrl: process.env.MONGODB_URI,
  collection: 'sessions',
  mongooseConnection: mongoose.connection,
});

store.on('error', function (error) {
  console.error('Session store error:', error);
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60, // Set maxAge to 1 hour
  },
}));

// TO CALL OUR EJS
app.set(`view engine`, `ejs`);

//TO BE ABLE TO ACCESS OUR STATIC FILES -- IMG, CSS, VIDEOS
app.use(express.static(__dirname + "/public/"));
app.use(express.urlencoded({ extended: false }));


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
app.use(`/`, require(`./route/frontendRoute`));
app.use(`/registration`, require(`./route/loginRoute`));
app.use(`/users`, require(`./route/userRoute`));
app.use(`/backend`, require(`./route/backendRoute`));
app.use('/', doctorApiRoute);

