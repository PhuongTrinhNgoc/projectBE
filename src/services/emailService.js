const nodemailer = require('nodemailer');

// Tạo transporter để gửi email
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Hoặc thay đổi theo nhà cung cấp email của bạn
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hàm gửi email reset mật khẩu
const sendResetPasswordEmail = async (user, resetToken) => {
  const resetURL = `http://localhost:3000/reset-password/${resetToken}`;
  const mailOptions = {
    from: 'phuongxu0398@gmail.com',
    to: user.email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetURL}`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendResetPasswordEmail,
};
