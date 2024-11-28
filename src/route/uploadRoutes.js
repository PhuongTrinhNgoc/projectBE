const express = require('express');
const upload = require('../middlewere/uploadMiddlewere');

const router = express.Router();

// Upload một file
router.post('/single', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded!' });
  }
  res.status(200).json({
    message: 'File uploaded successfully!',
    url: req.file.path, // Đường dẫn file trên Cloudinary
  });
});

// Upload nhiều file
router.post('/multiple', upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded!' });
  }
  const fileUrls = req.files.map((file) => file.path); // Đường dẫn file trên Cloudinary
  res.status(200).json({
    message: 'Files uploaded successfully!',
    urls: fileUrls,
  });
});

module.exports = router;
