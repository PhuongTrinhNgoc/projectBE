// middlewares/formidableMiddleware.js
const formidable = require("formidable");
const path = require("path");

const formidableMiddleware = (options = {}) => {
  return (req, res, next) => {
    const form = new formidable.IncomingForm({
      uploadDir: path.join(__dirname, "../uploads"),
      keepExtensions: true,
      ...options,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return next(err);
      }

      req.body = fields;
      req.files = files;
      next();
    });

    // Kiểm tra xem có dữ liệu JSON trong body không
    if (req.is('application/json')) {
      req.body = req.body || {};
      next();
    }
  };
};

module.exports = formidableMiddleware;
