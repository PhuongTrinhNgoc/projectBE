const { Sequelize } = require("sequelize");
const { Op } = require("sequelize"); // Đảm bảo Op được import
const user = require("../../src/db/models/user");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const formidable = require("formidable");
const cloudinary = require("./cloudinary/cloudinaryConfig"); // Đường dẫn đến file cloudinary config

// Lấy danh sách người dùng với phân trang
const getAllUser = catchAsync(async (req, res, next) => {
  // Lấy token từ cookies
  const token = req.cookies.token;

  // Kiểm tra nếu không có token trong cookies
  if (!token) {
    return next(new AppError('You are not logged in! Please log in to access this resource.', 401));
  }

  // (Tùy chọn) Giải mã và xác thực token, ví dụ với JWT
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Sau khi xác thực, tiếp tục logic phân trang
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit; // Bắt đầu từ phần tử nào

  const users = await user.findAndCountAll({
    attributes: { exclude: ["password"] },
    limit: limit, // Giới hạn số lượng phần tử trả về
    offset: offset, // Bỏ qua một số phần tử trước khi lấy
  });

  const totalPages = Math.ceil(users.count / limit); // Tính tổng số trang

  // Kiểm tra nếu trang không tồn tại
  if (page > totalPages) {
    return next(
      new AppError(
        `Page ${page} does not exist. Total number of pages is ${totalPages}`,
        404
      )
    );
  }

  return res.status(200).json({
    status: "success",
    page: page, // Trang hiện tại
    totalPages: totalPages, // Tổng số trang
    totalItems: users.count, // Tổng số người dùng
    data: users.rows, // Người dùng cho trang hiện tại
  });
});


// Middleware để phân tích file tải lên

// Cập nhật thông tin người dùng
const updateUserInfo = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // Lấy ID người dùng từ token
  const { userType, firstName, lastName } = req.body;

  // Tìm người dùng theo ID
  const userRecord = await user.findByPk(userId);

  if (!userRecord) {
    return next(new AppError("User not found", 404));
  }

  // Cập nhật thông tin người dùng nếu có
  if (userType)
    userRecord.userType = Array.isArray(userType) ? userType[0] : userType;
  if (firstName)
    userRecord.firstName = Array.isArray(firstName) ? firstName[0] : firstName;
  if (lastName)
    userRecord.lastName = Array.isArray(lastName) ? lastName[0] : lastName;

  // Cập nhật ảnh đại diện nếu có
  if (req.files && req.files.profilePicture) {
    const profilePicture = Array.isArray(req.files.profilePicture)
      ? req.files.profilePicture[0]
      : req.files.profilePicture;

    try {
      const result = await cloudinary.uploader.upload(profilePicture.filepath, {
        resource_type: "auto",
        folder: "user",
      });
      userRecord.profilePicture = result.secure_url; // Lưu đường dẫn ảnh đã upload
    } catch (err) {
      return next(new AppError("Error uploading image to Cloudinary", 500));
    }
  }

  // Lưu thay đổi vào cơ sở dữ liệu
  await userRecord.save();

  res.status(200).json({
    status: "success",
    message: "User information updated successfully",
    data: {
      user: userRecord,
    },
  });
});

module.exports = { getAllUser, updateUserInfo };
