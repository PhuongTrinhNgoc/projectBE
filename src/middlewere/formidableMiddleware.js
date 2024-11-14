const formidable = require("formidable");
const path = require("path");
const fs = require("fs");

const formidableMiddleware = (options = {}) => {
  return (req, res, next) => {
    const form = new formidable.IncomingForm({
      uploadDir: path.join(__dirname, "../uploads"), // Lưu vào thư mục uploads tạm thời
      keepExtensions: true,
      ...options,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return next(err);
      }

      req.body = fields; // Gán các trường văn bản cho `req.body`
      req.files = files; // Gán các tệp cho `req.files`

      // Tiếp tục tới controller
      next();
    });

    // Kiểm tra xem có dữ liệu JSON trong body không (cho trường hợp không có file)
    if (req.is("application/json")) {
      req.body = req.body || {};
      next();
    }
  };
};

module.exports = formidableMiddleware;
