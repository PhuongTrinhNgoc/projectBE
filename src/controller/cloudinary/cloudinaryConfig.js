const cloudinary = require('cloudinary').v2;
require('dotenv').config();
   // Configuration
   cloudinary.config({ 
    cloud_name: 'dluus3fyi', 
    api_key: process.env.API_KEY_CLOUD, 
    api_secret: process.env.API_SECRET_CLOUD 
});
module.exports = cloudinary;