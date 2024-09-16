const catchAsync = require("../utils/catchAsync");
const project = require("../db/models/project");
const user = require("../db/models/user");
const AppError = require("../utils/appError");

const createProject = catchAsync(async (req, res, next) => {
  const body = req.body;
  const userId = req.user.id;
  const newProject = await project.create({
    title: body.title,
    productImage: body.productImage,
    price: body.price,
    shortDescription: body.shortDescription,
    description: body.description,
    productUrl: body.productUrl,
    category: body.category,
    tags: body.tags,
    createdBy: userId,
  });
  return res.status(201).json({
    status: "success",
    data: newProject,
  });
});

const getAllProject = catchAsync(async (req, res, next) => {
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit; // Bắt đầu từ phần tử nào
  const userId = req.user.id;
  // Truy vấn dữ liệu và số lượng tổng cộng
  const { rows: projects, count: totalProjects } = await project.findAndCountAll({
    include: user,
    where: { createdBy: userId },
    limit: limit,
    offset: offset,
  });

  const totalPages = Math.ceil(totalProjects / limit); // Tính tổng số trang

  // Kiểm tra nếu trang không tồn tại
  if (page > totalPages) {
    return next(
      new AppError(
        `Page ${page} does not exist. Total number of pages is ${totalPages}`,
        404
      )
    );
  }
  
  return res.json({
    status: "success",
    page: page, // Trang hiện tại
    totalPages: totalPages, // Tổng số trang
    totalItems: totalProjects, // Tổng số người dùng
    data: projects,
    
  });
});

const getProjectById = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const result = await project.findByPk(id, { include: user });
  if (!result) {
    return next(new AppError("Invalid project id", 400));
  }
  return res.json({
    status: "success",
    data: result,
  });
});
const updateProject = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const projectId = req.params.id;
  const body = req.body;
  const rel = await project.findOne({
    where: { id: projectId, createdBy: userId },
  });
  if (!rel) {
    return next(new AppError("Ivalid project id", 400));
  }

  rel.title = body.title;
  rel.productImage = body.productImage;
  rel.price = body.price;
  rel.shortDescription = body.shortDescription;
  rel.description = body.description;
  rel.productUrl = body.productUrl;
  rel.category = body.category;
  rel.tags = body.tags;

  const updateResult = await rel.save();

  return res.json({
    status: "success",
    data: updateResult,
  });
});
const deleteProject = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const projectId = req.params.id;
  const rel = await project.findOne({
    where: { id: projectId, createdBy: userId },
  });
  if (!rel) {
    return next(new AppError("Ivalid project id", 400));
  }
  await rel.destroy();
  return res.json({
    status: "success",
    message: "delete successfully",
  });
});
module.exports = {
  getAllProject,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
};
