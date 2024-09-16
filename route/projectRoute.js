const { authentication, restricTo } = require("../controller/authController");
const {
  createProject,
  getAllProject,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controller/projectController");

// /route/authRouter.js
const router = require("express").Router();

router
  .route("/")
  .post(authentication, restricTo("1"), createProject)
  .get(authentication, restricTo("1"), getAllProject);
router
  .route("/:id")
  .get(authentication,restricTo("1"), getProjectById)
  .patch(authentication,restricTo("1"), updateProject)
  .delete(authentication,restricTo("1"), deleteProject);
module.exports = router;
