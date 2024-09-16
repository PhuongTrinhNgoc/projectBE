const { authentication, restricTo } = require("../controller/authController");
const { getAllUser, updateUserInfo } = require("../controller/userController");
const upload = require('../middlewere/uploadMiddlewere'); // Thêm middleware để xử lý tải lên tệp tin

const router = require("express").Router();

// Route để lấy tất cả người dùng, chỉ dành cho Super Admin
router.route("/").get(authentication, restricTo("0"), getAllUser);

// Route để cập nhật thông tin người dùng, bao gồm ảnh đại diện
router.route("/update-info").patch(authentication,  upload.single('profilePicture'), updateUserInfo)
module.exports = router;
