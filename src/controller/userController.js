const { Sequelize } = require("sequelize");
const { Op } = require("sequelize"); // Đảm bảo Op được import
const user = require("../../src/db/models/user");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const formidable = require("formidable");
const cloudinary = require("./cloudinary/cloudinaryConfig"); // Đường dẫn đến file cloudinary config
const jwt = require("jsonwebtoken");
const SibApiV3Sdk = require("@sendinblue/client"); // Thư viện Brevo
const RoleChangeRequest = require("../db/models/RoleChangeRequest");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// Lấy danh sách người dùng với phân trang
const getAllUser = catchAsync(async (req, res, next) => {
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
  console.log(users.rows);
  
  return res.status(200).json({
    status: "success",
    page: page, // Trang hiện tại
    totalPages: totalPages, // Tổng số trang
    totalItems: users.count, // Tổng số người dùng
    data: users.rows, // Người dùng cho trang hiện tại
  });
});


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
    console.log("prooofieeeeeeee-->",profilePicture.filepath);
    
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


const requestRoleChange = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // Giả định bạn đã xác thực người dùng
  const newUserType = req.body.newUserType; // Lấy kiểu người dùng mới từ body

  // Kiểm tra nếu kiểu người dùng mới hợp lệ (chỉ cho phép vai trò '1' hoặc '2')
  if (!Array.isArray(newUserType) || newUserType.length !== 1 || (newUserType[0] !== "1" && newUserType[0] !== "2")) {
    return next(new AppError("Chỉ có thể thêm tài khoản người quản lý hoặc vai trò hợp lệ.", 400));
  }
  
  const userFind = await user.findByPk(userId);
  if (!userFind) {
    return next(new AppError("Người dùng không tồn tại.", 404));
  }

  const existingRoles = userFind.userType;

  // Kiểm tra nếu người dùng đã có vai trò '1' (quản lý) và yêu cầu thay đổi sang '1'
  if (existingRoles.includes("1") && newUserType[0] === "1") {
    return next(new AppError("Bạn đã là tài khoản admin.", 400));
  }

  // Kiểm tra nếu người dùng đã có vai trò '1' và muốn thêm vai trò '2', thêm trực tiếp vai trò '2'
  if (existingRoles.includes("1") && newUserType[0] === "2") {
    await user.update({
      userType: [...existingRoles, "2"],  // Thêm vai trò '2' cho người dùng
    }, {
      where: { id: userId },
    });
    return res.status(200).json({
      status: "success",
      message: "Vai trò người dùng đã được thêm thành công.",
    });
  }

  // Kiểm tra nếu đã có yêu cầu thay đổi vai trò đang chờ phê duyệt
  const existingRequest = await RoleChangeRequest.findOne({
    where: {
      userId: userId,
      status: "pending",  // Chỉ kiểm tra yêu cầu đang chờ phê duyệt
    },
  });
  if (existingRequest) {
    return next(new AppError("Đã có yêu cầu thay đổi vai trò đang chờ phê duyệt. Vui lòng đợi.", 400));
  }

  // Tạo token thay đổi vai trò
  const changeRoleToken = generateToken({ id: userId, newUserType: newUserType[0] });
  const changeRoleTokenExpires = Date.now() + 10 * 60 * 1000; // Token có hiệu lực trong 10 phút

  // Lưu token và thời gian hết hạn vào cơ sở dữ liệu
  await user.update(
    {
      changeRoleToken,
      changeRoleTokenExpires,
    },
    {
      where: { id: userId }, // Thêm điều kiện where
    }
  );

  // Tạo bản ghi yêu cầu thay đổi vai trò
  await RoleChangeRequest.create({
    userId: userId,
    requestedRole: newUserType[0],
    status: "pending",
    requesterEmail: userFind.email,
    requestedAt: new Date(),
  });

  res.status(200).json({
    status: 'success',
    message: 'Yêu cầu thay đổi vai trò đã được gửi. Chờ phê duyệt.',
  });
});



const changeRole = catchAsync(async (req, res, next) => {
  const { token } = req.params;  // Lấy token từ URL
  const { newUserType, status } = req.body;  // Lấy kiểu người dùng mới và trạng thái duyệt từ body

  // Kiểm tra userType có hợp lệ và chỉ cho phép thêm vai trò '1'
  if (
    !Array.isArray(newUserType) ||
    newUserType.length !== 1 ||  // Chỉ cho phép thay đổi 1 vai trò
    newUserType[0] !== "1"      // Chỉ cho phép thêm vai trò '1'
  ) {
    return next(
      new AppError("Yêu cầu không hợp lệ. Chỉ có thể thêm tài khoản người quản lý.", 400)
    );
  }

  // Tìm người dùng theo token (giả định token được lưu trong DB để xác minh)
  const userfind = await user.findOne({
    where: {
      changeRoleToken: token,  // Giả định bạn lưu token thay đổi vai trò
      changeRoleTokenExpires: { [Op.gt]: Date.now() },  // Token còn hiệu lực
    },
  });

  if (!userfind) {
    return next(new AppError("Token không hợp lệ hoặc đã hết hạn.", 400));
  }

  const existingRoles = userfind.userType;
  const userId = userfind.id;

  // Xử lý theo trạng thái duyệt
  if (status === "approved") {
    // Kiểm tra nếu người dùng đã có tài khoản người quản lý
    if (existingRoles.includes("1")) {
      return next(
        new AppError("Người dùng đã có tài khoản người quản lý. Không cần thay đổi.", 400)
      );
    }

    // Đảm bảo người dùng đã có vai trò '2' trước khi thêm tài khoản người quản lý
    if (!existingRoles.includes("2")) {
      return next(
        new AppError("Người dùng phải có vai trò '2' trước khi thêm tài khoản người quản lý.", 400)
      );
    }

    // Thêm tài khoản người quản lý cho người dùng
    await user.update({
      userType: [...existingRoles, "1"],  // Thêm vai trò '1' cho người quản lý
      changeRoleToken: null,  // Xóa token sau khi hoàn thành
      changeRoleTokenExpires: null,  // Xóa thời gian hết hạn token
    }, {
      where: { id: userId },
    });

    // Cập nhật trạng thái yêu cầu trong bảng RoleChangeRequest thành 'approved'
    await RoleChangeRequest.update({
      status: 'approved',
      reviewedBy:process.env.ADMIN_EMAIL,
    }, {
      where: { userId: userId, requestedRole: "1" },
    });

    return res.status(200).json({
      status: "success",
      message: "Tài khoản người quản lý đã được thêm thành công.",
    });

  } else if (status === "rejected") {
    // Nếu yêu cầu bị từ chối, chỉ cập nhật trạng thái thành "rejected"
    await RoleChangeRequest.update({
      status: 'rejected',  // Đặt trạng thái là "rejected"
    }, {
      where: { userId: userId, requestedRole: "1" },
    });

    // Xóa token thay đổi vai trò sau khi từ chối
    await user.update({
      changeRoleToken: null,  // Xóa token sau khi từ chối
      changeRoleTokenExpires: null,  // Xóa thời gian hết hạn token
    }, {
      where: { id: userId },
    });

    return res.status(200).json({
      status: "success",
      message: "Yêu cầu thay đổi vai trò đã bị từ chối.",
    });

  } else {
    return next(new AppError("Trạng thái không hợp lệ. Chỉ chấp nhận 'approved' hoặc 'rejected'.", 400));
  }
});


module.exports = { getAllUser, updateUserInfo ,changeRole,requestRoleChange};
