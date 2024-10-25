const catchAsync = require("../utils/catchAsync");
const project = require("../db/models/project");
const user = require("../db/models/user");
const AppError = require("../utils/appError");
const cloudinary = require("../controller/cloudinary/cloudinaryConfig"); // Đường dẫn đến file cloudinary config

const formidable = require("formidable");

const createProject = catchAsync(async (req, res, next) => {
  const body = req.body;
  const userId = req.user.id;

  // Tạo dự án với dữ liệu văn bản
  const newProject = await project.create({
    title: body.title,
    productImage: [], // Khởi tạo dưới dạng mảng rỗng để cập nhật sau
    price: body.price,
    shortDescription: body.shortDescription,
    description: body.description,
    productUrl: body.productUrl,
    category: body.category,
    tags: body.tags,
    createdBy: userId,
  });

  console.log("bodyyyyyyyyyyy", body);

  // Kiểm tra xem có productImage trong body không
  if (req.body.productImage) {
    const productImageUrls = Array.isArray(req.body.productImage)
      ? req.body.productImage
      : [req.body.productImage];

    try {
      // Tải từng ảnh lên Cloudinary
      const uploadPromises = productImageUrls.map(async (imageUrl) => {
        const result = await cloudinary.uploader.upload(imageUrl, {
          resource_type: "auto",
          folder: "projects", // Lưu ảnh vào thư mục "projects"
        });
        return result.secure_url; // Lưu lại URL an toàn
      });

      // Chờ tất cả các ảnh được tải lên
      const uploadedImages = await Promise.all(uploadPromises);
      newProject.productImage = uploadedImages; // Cập nhật URL đã tải lên cho project
    } catch (err) {
      console.log(err);
      return next(new AppError("Error uploading product image to Cloudinary", 500));
    }
  }

  // Lưu dự án sau khi cập nhật productImage
  await newProject.save();

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
  const { rows: projects, count: totalProjects } =
    await project.findAndCountAll({
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
  createProject,
  getAllProject,
  getProjectById,
  updateProject,
  deleteProject,
};
