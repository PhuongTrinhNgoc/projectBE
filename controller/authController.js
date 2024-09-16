const user = require("../db/models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@sendinblue/client"); // Thư viện Brevo
const { Op } = require("sequelize");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// Signup function
const signup = catchAsync(async (req, res, next) => {
  const { userType, firstName, lastName, email, password, confirmPassword } =
    req.body;

  // Kiểm tra userType có hợp lệ không
  if (!["1", "2"].includes(userType)) {
    return next(new AppError("Invalid user type", 400));
  }

  // Tạo người dùng mới
  const newUser = await user.create({
    userType,
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
  });

  if (!newUser) {
    return next(new AppError("Failed to create the user", 400));
  }

  // Chuyển đổi người dùng thành JSON và xóa các thông tin không cần thiết
  const result = newUser.toJSON();
  delete result.password;
  delete result.deletedAt;

  // Tạo token JWT
  result.token = generateToken({ id: result.id });

  // Trả về phản hồi thành công
  res.status(201).json({
    status: "success",
    data: result,
  });
});
//admin
const loginAdmin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Kiểm tra tính hợp lệ của dữ liệu đầu vào
  if (!email || !password) {
    return next(new AppError("Please provide both email and password", 400));
  }

  // Tìm người dùng theo email
  const result = await user.findOne({ where: { email } });

  // Kiểm tra nếu người dùng không tồn tại hoặc so sánh mật khẩu không đúng
  if (!result || !(await bcrypt.compare(password, result.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Kiểm tra vai trò của người dùng
  if (result.userType !== "0") {
    return next(
      new AppError("You are not authorized to access this resource", 403)
    );
  }

  // Tạo token JWT
  const token = generateToken({ id: result.id });

  // Trả về phản hồi thành công với token
  res.status(200).json({
    status: "success",
    token,
  });
});

const changePasswordForAdmin = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  let idToken = "";

  // Kiểm tra tiêu đề authorization có chứa token không
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    idToken = req.headers.authorization.split(" ")[1];
  }

  if (!idToken) {
    return next(new AppError("Please login to get access", 401));
  }

  // Xác minh token
  const tokenDetail = jwt.verify(idToken, process.env.JWT_SECRET_KEY);

  // Tìm người dùng từ token
  const freshUser = await user.findByPk(tokenDetail.id);

  // Kiểm tra nếu người dùng không tồn tại
  if (!freshUser) {
    return next(new AppError("User no longer exists", 401));
  }
  // Kiểm tra nếu người dùng không tồn tại hoặc không phải admin
  if (freshUser.userType !== "0") {
    return next(
      new AppError("You do not have permission to perform this action", 403)
    );
  }
  if (!(await bcrypt.compare(currentPassword, freshUser.password))) {
    return next(new AppError("Current password is incorrect", 401));
  }
  if (newPassword !== confirmPassword) {
    return next(new AppError("Passwords do not match", 400));
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  freshUser.password = hashedPassword;

  await freshUser.save();
  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
  });
});

// Login function
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Kiểm tra tính hợp lệ của dữ liệu đầu vào
  if (!email || !password) {
    return next(new AppError("Please provide both email and password", 400));
  }

  // Tìm người dùng theo email
  const result = await user.findOne({ where: { email } });

  // Kiểm tra nếu người dùng không tồn tại hoặc so sánh mật khẩu không đúng
  if (!result || !(await bcrypt.compare(password, result.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  if (result.userType == "0") {
    return next(
      new AppError("You are not authorized to access this resource", 403)
    );
  }

  // Tạo token JWT
  const token = generateToken({ id: result.id });

  // Trả về phản hồi thành công với token
  res.status(200).json({
    status: "success",
    token,
  });
});

const authentication = catchAsync(async (req, res, next) => {
  let idToken = "";

  // Kiểm tra tiêu đề authorization có chứa token không
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    idToken = req.headers.authorization.split(" ")[1];
  }

  if (!idToken) {
    return next(new AppError("Please login to get access", 401));
  }

  // Xác minh token
  const tokenDetail = jwt.verify(idToken, process.env.JWT_SECRET_KEY);

  // Tìm người dùng từ token
  const freshUser = await user.findByPk(tokenDetail.id);

  // Kiểm tra nếu người dùng không tồn tại
  if (!freshUser) {
    return next(new AppError("User no longer exists", 401));
  }

  // Gán thông tin người dùng vào request
  req.user = freshUser;

  // Tiếp tục xử lý yêu cầu
  return next();
});

const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  let idToken = "";

  // Kiểm tra tiêu đề authorization có chứa token không
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    idToken = req.headers.authorization.split(" ")[1];
  }

  if (!idToken) {
    return next(new AppError("Please login to get access", 401));
  }

  // Xác minh token
  const tokenDetail = jwt.verify(idToken, process.env.JWT_SECRET_KEY);

  // Tìm người dùng từ token
  const freshUser = await user.findByPk(tokenDetail.id);

  // Kiểm tra nếu người dùng không tồn tại
  if (!freshUser) {
    return next(new AppError("User no longer exists", 401));
  }
  if (!(await bcrypt.compare(currentPassword, freshUser.password))) {
    return next(new AppError("Current password is incorrect", 401));
  }
  if (newPassword !== confirmPassword) {
    return next(new AppError("Passwords do not match", 400));
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  freshUser.password = hashedPassword;

  await freshUser.save();
  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
  });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Kiểm tra xem email có tồn tại trong cơ sở dữ liệu không
  const userRecord = await user.findOne({ where: { email } });

  if (!userRecord) {
    return next(new AppError("No user found with that email address", 404));
  }

  // Tạo mã xác nhận có thời hạn 10 phút
  const resetCode = Math.floor(100000 + Math.random() * 900000); // Mã xác nhận 6 chữ số
  const resetCodeExpiration = Date.now() + 10 * 60 * 1000; // Mã có hiệu lực trong 10 phút

  // Lưu mã xác nhận vào cơ sở dữ liệu
  userRecord.resetPasswordToken = resetCode.toString();
  userRecord.resetPasswordExpires = resetCodeExpiration;
  await userRecord.save();

  // Tạo đối tượng API của Brevo
  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );
  const isAdmin = userRecord.userType === "0"; // Xác định xem người dùng có phải là admin không
  // Định dạng email gửi đi
  const sendSmtpEmail = {
    to: [
      { email: email, name: `${userRecord.firstName} ${userRecord.lastName}` },
    ],
    sender: { email: process.env.EMAIL_USER, name: "Phuonghehe" },
    subject: "Password Reset Code",
    htmlContent: `<p>${
      isAdmin
        ? "As an admin, you requested a password reset. Please click on the following link to reset your password:"
        : "You requested a password reset. Please click on the following link to reset your password:"
    }</p>
                  <p><strong>${resetCode}</strong></p>
                  <p>The code is valid for 10 minutes. If you did not request this, please ignore this email.</p>`,
  };

  // Gửi email
  await apiInstance.sendTransacEmail(sendSmtpEmail);

  // Phản hồi thành công
  res.status(200).json({
    status: "success",
    message: "Reset password code sent to email",
  });
});

const resetPasswordController = catchAsync(async (req, res, next) => {
  const { resetCode, newPassword } = req.body;

  // Kiểm tra xem mã xác nhận và mật khẩu mới có được cung cấp không
  if (!resetCode || !newPassword) {
    return next(
      new AppError("Please provide both reset code and new password", 400)
    );
  }

  // Tìm người dùng dựa trên mã xác nhận
  const userRecord = await user.findOne({
    where: {
      resetPasswordToken: resetCode,
      resetPasswordExpires: { [Op.gt]: Date.now() }, // Mã xác nhận còn hiệu lực
    },
  });

  if (!userRecord) {
    return next(new AppError("Invalid or expired reset code", 400));
  }

  // Mã xác nhận hợp lệ, tiến hành thay đổi mật khẩu
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  userRecord.password = hashedPassword;
  userRecord.resetPasswordToken = null;
  userRecord.resetPasswordExpires = null;
  await userRecord.save();

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully",
  });
});

const restricTo = (...userType) => {
  const checkPermisson = (req, res, next) => {
    if (!userType.includes(req.user.userType)) {
      return next(
        new AppError("you don't have permission to perform this action", 403)
      );
    }
    return next();
  };
  return checkPermisson;
};

module.exports = {
  signup,
  login,
  authentication,
  restricTo,
  changePassword,
  forgotPassword,
  resetPasswordController,
  loginAdmin,
  changePasswordForAdmin,
};
