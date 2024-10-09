// /route/authRouter.js
const {
  signup,
  login,
  changePassword,
  forgotPassword,
  resetPasswordController,
  loginAdmin,
  changePasswordForAdmin
} = require("../controller/authController");
const router = require("express").Router();

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/loginAdmin").post(loginAdmin);
router.route("/changePassword").post(changePassword);
router.route("/changePasswordForAdmin").post(changePasswordForAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPasswordController);

module.exports = router;
