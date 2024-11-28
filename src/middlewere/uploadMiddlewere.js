const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const { v2: cloudinary } = require('cloudinary');
const cloudinary = require('../controller/cloudinary/cloudinaryConfig')
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.API_KEY_CLOUD,       
//   api_secret: process.env.API_SECRET_CLOUD, 
// });

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'projects', 
    format: async (req, file) => 'png',
    public_id: (req, file) => `${Date.now()}_${file.originalname}`, 
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

module.exports = upload;
