// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Đặt cấu hình lưu trữ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Thư mục lưu trữ ảnh
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`); // Tạo tên tệp tin duy nhất
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước tệp tin (5MB)
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép tệp tin hình ảnh
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
});

module.exports = upload;
