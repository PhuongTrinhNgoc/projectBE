const user = require("../db/models/user");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@sendinblue/client"); // Thư viện Brevo
const { Op } = require("sequelize");
const RoleChangeRequest = require("../db/models/RoleChangeRequest");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const signup = catchAsync(async (req, res, next) => {
  const { userType, firstName, lastName, email, password, confirmPassword } =
    req.body;

  // Kiểm tra userType có hợp lệ không
  if (
    !Array.isArray(userType) ||
    userType.length === 0 || // Phải có ít nhất một giá trị
    !userType.every((type) => ["1", "2"].includes(type))
  ) {
    return next(
      new AppError("Invalid user type. Must be either [1] or [2]", 400)
    );
  }

  // Kiểm tra người dùng đã tồn tại hay chưa
  const existingUser = await user.findOne({ where: { email } });
  if (existingUser) {
    // Người dùng đã tồn tại
    if (userType.length === 1) {
      if (userType[0] === "2" && existingUser.userType.includes("1")) {
        // Người dùng đã có vai trò '1' và đang đăng ký vai trò '2'
        // Cập nhật người dùng để thêm vai trò '2' mà không cần gửi yêu cầu phê duyệt
        await existingUser.update({
          userType: [...existingUser.userType, "2"],
        });

        return res.status(200).json({
          status: "success",
          message: "Role '2' has been added successfully.",
        });
      } else if (userType[0] === "1" && existingUser.userType.includes("2")) {
        // Người dùng đã có vai trò '2' và đang đăng ký vai trò '1'
        // Gửi yêu cầu phê duyệt cho admin
        await RoleChangeRequest.create({
          userId: existingUser.id,
          status: "pending",
          reviewedBy: null,
          requesterEmail: existingUser.email,
          // Chưa được xem xét
        });

        return res.status(200).json({
          status: "success",
          message:
            "Request to add role '1' has been sent. Please wait for approval.",
        });
      } else {
        return next(
          new AppError("User already exists with the requested role", 400)
        );
      }
    }
  } else {
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

    const result = newUser.toJSON();
    delete result.password;
    delete result.deletedAt;

    // Tạo token JWT
    result.token = generateToken({ id: result.id });

    res.status(201).json({
      status: "success",
      data: result,
    });
  }
});
const approveRoleChange = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  // Tìm yêu cầu thay đổi vai trò đang chờ xử lý
  const roleChangeRequest = await RoleChangeRequest.findOne({
    where: { userId, status: "pending" },
  });

  if (!roleChangeRequest) {
    return next(new AppError("No pending request found", 404));
  }

  // Tìm người dùng để cập nhật vai trò
  const userToUpdate = await user.findByPk(userId);
  if (!userToUpdate) {
    return next(new AppError("User not found", 404));
  }

  // Cập nhật vai trò của người dùng
  userToUpdate.userType = [...userToUpdate.userType, "1"]; // Thêm vai trò ['1']
  await userToUpdate.save();

  // Cập nhật trạng thái yêu cầu
  roleChangeRequest.status = "approved";
  await roleChangeRequest.save();

  res.status(200).json({
    status: "success",
    message: "User role updated successfully",
  });
});

// Login function for admin
const loginAdmin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide both email and password", 400));
  }

  const result = await user.findOne({ where: { email } });

  if (!result || !(await bcrypt.compare(password, result.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Kiểm tra nếu userType không chứa "0" (super admin)
  if (!result.userType.includes("0")) {
    return next(
      new AppError("You are not authorized to access this resource", 403)
    );
  }

  const token = generateToken({ id: result.id });

  // Lưu token vào cookies
  res.cookie('token', token, {
    httpOnly: true, // Chỉ server mới có thể truy cập
    secure: process.env.NODE_ENV === 'production', // Bật chế độ bảo mật trong môi trường production
    sameSite: 'strict', // Bảo vệ chống lại CSRF
    maxAge: 24 * 60 * 60 * 1000, // Token có hiệu lực trong 1 ngày
  });

  res.status(200).json({
    status: "success",
    token, // Gửi token trong response (nếu cần)
  });
});
// const loginAdmin = catchAsync(async (req, res, next) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return next(new AppError("Please provide both email and password", 400));
//   }

//   const result = await user.findOne({ where: { email } });

//   if (!result || !(await bcrypt.compare(password, result.password))) {
//     return next(new AppError("Incorrect email or password", 401));
//   }

//   // Kiểm tra nếu userType không chứa "0" (super admin)
//   if (!result.userType.includes("0")) {
//     return next(
//       new AppError("You are not authorized to access this resource", 403)
//     );
//   }

//   const token = generateToken({ id: result.id });

//   res.status(200).json({
//     status: "success",
//     token,
//   });
// });


// Change password for admin
const changePasswordForAdmin = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  let idToken = "";

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    idToken = req.headers.authorization.split(" ")[1];
  }

  if (!idToken) {
    return next(new AppError("Please login to get access", 401));
  }

  const tokenDetail = jwt.verify(idToken, process.env.JWT_SECRET_KEY);

  const freshUser = await user.findByPk(tokenDetail.id);

  if (!freshUser) {
    return next(new AppError("User no longer exists", 401));
  }

  // Kiểm tra nếu userType không chứa "0"
  if (!freshUser.userType.includes("0")) {
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

  // Verify the token
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

// Login function for regular users
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Kiểm tra xem email và mật khẩu có được cung cấp không
  if (!email || !password) {
    return next(new AppError("Please provide both email and password", 400));
  }

  // Tìm user theo email
  const result = await user.findOne({ where: { email } });

  // Kiểm tra email và mật khẩu có hợp lệ không
  if (!result || !(await bcrypt.compare(password, result.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Kiểm tra nếu userType chứa "0" (admin)
  if (result.userType.includes("0")) {
    return next(
      new AppError("You are not authorized to access this resource", 403)
    );
  }

  // Tạo token
  const token = generateToken({ id: result.id });

  // Cài đặt token vào cookies
  res.cookie('token', token, {
    httpOnly: true, // Chỉ truy cập được bởi server, bảo vệ chống lại XSS
    secure: process.env.NODE_ENV === 'production', // Chỉ bật trong môi trường production
    sameSite: 'strict', // Bảo vệ chống lại CSRF
    maxAge: 24 * 60 * 60 * 1000, // Thời gian tồn tại của cookie (1 ngày)
  });

  // Trả về phản hồi JSON kèm với token (nếu cần cho phía client)
  res.status(200).json({
    status: "success",
    message: "Login successful",
    token, // Bạn có thể bỏ token này nếu chỉ cần lưu trong cookies
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
// Restrict function based on userType array
const restricTo = (...userTypes) => {
  const checkPermission = (req, res, next) => {
    if (!userTypes.some((type) => req.user.userType.includes(type))) {
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );
    }
    return next();
  };
  return checkPermission;
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
  approveRoleChange,
};
