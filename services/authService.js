const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
const { sendResetPasswordEmail } = require('./emailService'); // Đảm bảo đường dẫn đúng với tệp emailService.js
const user = require('../db/models/user');

// Hàm yêu cầu reset mật khẩu
const requestPasswordReset = async (email) => {
  const users = await user.findOne({ where: { email } });
  if (!users) {
    throw new Error('No user found with that email address');
  }

  // Tạo mã reset password và lưu vào cơ sở dữ liệu
  const resetToken = crypto.randomBytes(32).toString('hex');
  users.resetPasswordToken = resetToken;
  users.resetPasswordExpires = Date.now() + 3600000; // Token hết hạn sau 1 giờ
  
  // Cập nhật thông tin người dùng trong cơ sở dữ liệu
  await users.update({
    resetPasswordToken: resetToken,
    resetPasswordExpires: Date.now() + 3600000
  });

  await sendResetPasswordEmail(users, resetToken);
};

// Hàm reset mật khẩu
const resetPassword = async (token, newPassword, confirmPassword) => {
  const users = await user.findOne({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { [Sequelize.Op.gt]: Date.now() } // Kiểm tra token còn hiệu lực không
    }
  });

  if (!users) {
    throw new Error('Password reset token is invalid or has expired');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('Passwords do not match');
  }

  // Mã hóa mật khẩu mới
  users.password = await bcrypt.hash(newPassword, 10);
  users.resetPasswordToken = null;
  users.resetPasswordExpires = null;
  
  // Cập nhật thông tin người dùng trong cơ sở dữ liệu
  await users.save();
};

module.exports = {
  requestPasswordReset,
  resetPassword
};
