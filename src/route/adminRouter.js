const {
  authentication,
  restricTo,
  approveRoleChange,
} = require("../controller/authController");

const router = require("express").Router();
router
  .route("/approve-role/:userId")
  .patch(authentication, restricTo("0"), approveRoleChange);

module.exports = router;
