const { Sequelize } = require('sequelize');
const user = require('../db/models/user');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const path = require('path');
const getAllUser = catchAsync(async (req, res, next) => {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit, 10) || 20
    const offset = (page - 1) * limit; // Bắt đầu từ phần tử nào
    const users = await user.findAndCountAll({
        where: {
            userType: {
                [Sequelize.Op.ne]: '0',
            },
        },
        attributes: { exclude: ['password'] },
        limit: limit, // Giới hạn số lượng phần tử trả về
        offset: offset, // Bỏ qua một số phần tử trước khi lấy
    });

    const totalPages = Math.ceil(users.count / limit); // Tính tổng số trang

    // Kiểm tra nếu trang không tồn tại
    if (page > totalPages) {
      return next(new AppError(`Page ${page} does not exist. Total number of pages is ${totalPages}`, 404));
    }


    return res.status(200).json({
        status: 'success',
        page: page, // Trang hiện tại
        totalPages: Math.ceil(users.count / limit), // Tổng số trang
        totalItems: users.count, // Tổng số người dùng
        data: users.rows, // Người dùng cho trang hiện tại
    });
});

const updateUserInfo = catchAsync(async (req, res, next) => {
    const userId = req.user.id; // Lấy ID người dùng từ token
  
    const { userType, firstName, lastName } = req.body;
  
    // Tìm người dùng theo ID
    const userRecord = await user.findByPk(userId);
  
    if (!userRecord) {
      return next(new AppError('User not found', 404));
    }
  
    // Cập nhật thông tin người dùng
    if (userType) userRecord.userType = userType;
    if (firstName) userRecord.firstName = firstName;
    if (lastName) userRecord.lastName = lastName;
  
    // Cập nhật ảnh đại diện nếu có
    if (req.file) {
      userRecord.profilePicture = req.file.path; // Lưu đường dẫn đến ảnh
    }
  
    await userRecord.save();
  
    res.status(200).json({
      status: 'success',
      message: 'User information updated successfully',
      data: {
        user: userRecord,
      },
    });
  });
  
module.exports = { getAllUser,updateUserInfo };