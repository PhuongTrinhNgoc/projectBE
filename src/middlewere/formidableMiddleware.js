// middlewares/formidableMiddleware.js
const formidable = require("formidable");
const path = require("path");

const formidableMiddleware = (options = {}) => {
  return (req, res, next) => {
    const form = new formidable.IncomingForm({
      uploadDir: path.join(__dirname, "../uploads"), // Change this to your desired upload directory
      keepExtensions: true, // Keep file extensions
      ...options, // Allow customization of options
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return next(err);
      }

      req.body = fields; // Attach fields to the request
      req.files = files; // Attach files to the request
      next();
    });
  };
};

module.exports = formidableMiddleware;
