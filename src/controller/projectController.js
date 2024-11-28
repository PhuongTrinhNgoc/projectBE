const catchAsync = require("../utils/catchAsync");
const project = require("../db/models/project");
const user = require("../db/models/user");
const AppError = require("../utils/appError");
const { v2: cloudinary } = require("../controller/cloudinary/cloudinaryConfig");

const createProject = catchAsync(async (req, res, next) => {
  const body = req.body;
  const userId = req.user.id;

  // Tạo dự án với dữ liệu ban đầu
  const newProject = await project.create({
    title: body.title,
    productImage: [], 
    price: body.price,
    shortDescription: body.shortDescription,
    description: body.description,
    productUrl: "", 
    category: body.category,
    tags: body.tags,
    createdBy: userId,
  });

  try {
    // **1. Upload `productUrl` (1 ảnh)**
    if (req.body.productUrl) {
      const productUrlResult = await cloudinary.uploader.upload(req.body.productUrl, {
        resource_type: "image",
        folder: "project",
      });
      newProject.productUrl = productUrlResult.secure_url;
    }

    // **2. Upload `productImage` (nhiều ảnh)**
    if (req.body.productImage && Array.isArray(req.body.productImage)) {
      const uploadPromises = req.body.productImage.map(async (imageUrl) => {
        const result = await cloudinary.uploader.upload(imageUrl, {
          resource_type: "image",
          folder: "projects", 
        });
        return result.secure_url; 
      });

      const uploadedImages = await Promise.all(uploadPromises);
      newProject.productImage = uploadedImages; 
    }

    // Lưu lại project với các URL đã cập nhật
    await newProject.save();

    return res.status(201).json({
      status: "success",
      data: newProject,
    });
  } catch (error) {
    console.error("Lỗi khi upload ảnh:", error);
    return next(new AppError("Error uploading images to Cloudinary", 500));
  }
});

const getAllProject = catchAsync(async (req, res, next) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const { rows: projects, count: totalProjects } = await project.findAndCountAll({
    include: user,
    where: { createdBy: userId },
    limit: limit,
    offset: offset,
  });

  const totalPages = Math.ceil(totalProjects / limit);
  if (page > totalPages) {
    return next(new AppError(`Page ${page} does not exist.`, 404));
  }

  res.json({
    status: "success",
    page,
    totalPages,
    totalItems: totalProjects,
    data: projects,
  });
});

const getProjectById = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const result = await project.findByPk(id, { include: user });
  if (!result) {
    return next(new AppError("Project not found", 404));
  }

  res.json({
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
    return next(new AppError("Project not found", 404));
  }

  rel.title = body.title || rel.title;
  rel.price = body.price || rel.price;
  rel.shortDescription = body.shortDescription || rel.shortDescription;
  rel.description = body.description || rel.description;
  rel.productUrl = body.productUrl || rel.productUrl;
  rel.category = body.category || rel.category;
  rel.tags = body.tags || rel.tags;

  if (body.productImage && Array.isArray(body.productImage)) {
    try {
      // Xóa ảnh cũ trên Cloudinary nếu cần
      if (rel.productImage.length > 0) {
        await Promise.all(
          rel.productImage.map((imageUrl) =>
            cloudinary.uploader.destroy(imageUrl.split('/').pop().split('.')[0])
          )
        );
      }

      // Upload ảnh mới lên Cloudinary
      const uploadPromises = body.productImage.map((imageUrl) =>
        cloudinary.uploader.upload(imageUrl, {
          resource_type: "auto",
          folder: "projects",
        })
      );
      const uploadedImages = await Promise.all(uploadPromises);
      rel.productImage = uploadedImages.map((image) => image.secure_url);
    } catch (error) {
      return next(new AppError("Error uploading images to Cloudinary", 500));
    }
  }

  const updateResult = await rel.save();

  res.json({
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
    return next(new AppError("Project not found", 404));
  }

  // Xóa ảnh trên Cloudinary
  if (rel.productImage && rel.productImage.length > 0) {
    await Promise.all(
      rel.productImage.map((imageUrl) =>
        cloudinary.uploader.destroy(imageUrl.split('/').pop().split('.')[0])
      )
    );
  }

  await rel.destroy();

  res.json({
    status: "success",
    message: "Project deleted successfully.",
  });
});

module.exports = {
  createProject,
  getAllProject,
  getProjectById,
  updateProject,
  deleteProject,
};
