const express = require("express");
const { authentication, restricTo } = require("../controller/authController");
const { getAllUser,getUserById, updateUserInfo, changeRole, requestRoleChange } = require("../controller/userController");
const formidableMiddleware = require("../middlewere/formidableMiddleware"); // Correct path to the middleware

const router = express.Router();

// Route to get all users (only for Super Admin)
router.route("/").get(authentication, restricTo("0"), getAllUser)
router.route("/:id").get(authentication, restricTo("1","2"), getUserById)


// Route to update user info (including profile picture)
router.route("/update-info").patch(
  authentication, 
  formidableMiddleware(), // Apply formidable middleware here
  updateUserInfo
);
router.route("/send-changeRole/:token").post(authentication,requestRoleChange);

module.exports = router;
