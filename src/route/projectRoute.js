const { authentication, restricTo } = require("../controller/authController");
const {
  createProject,
  getAllProject,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controller/projectController");
const formidableMiddleware = require("../middlewere/formidableMiddleware");

// /route/authRouter.js
const router = require("express").Router();

router
  .route("/")
  .post(authentication, restricTo("1"), formidableMiddleware(), createProject)
  .get(authentication, restricTo("1","0"), getAllProject);
router
  .route("/:id")
  .get(authentication,restricTo("1"), getProjectById)
  .patch(authentication,restricTo("1"), updateProject)
  .delete(authentication,restricTo("1"), deleteProject);
module.exports = router;
