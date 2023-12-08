
const mongoose = require('mongoose');

function connect() {
  return new Promise((resolve, reject) => {
    mongoose.connect(process.env.MONGODB_URI, {
    
    });

    // Event listeners for connection-related events
    mongoose.connection.on('connected', () => {
      console.log('Mongodb Database Connected...');
      resolve();
    });

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
      reject(err);
    });
  });
}

module.exports = connect;
