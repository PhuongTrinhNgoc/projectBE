require("dotenv").config({ path: `${process.cwd()}` });
const express = require("express");
const cors = require("cors");
const app = express();

const authRouter = require("./route/authRouter");
const useRouter = require("./route/userRouter");
const projectRoute = require("./route/projectRoute");
const adminRouter = require("./route/adminRouter");
const catchAsync = require("./utils/catchAsync");
const AppError = require("./utils/appError");
const globalErrorHandle = require("./controller/errorController");
app.use(cors({
  origin: 'http://localhost:4200', // Thay đổi thành miền của ứng dụng front-end của bạn
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Quan trọng: cho phép gửi cookies và headers xác thực
}));
// Middleware để parse dữ liệu JSON
app.use(express.json());

// Route cho trang chủ


// Sử dụng authRouter cho các route liên quan tới /auth
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRoute);
app.use("/api/v1/users",useRouter );
app.use("/api/v1/admin",adminRouter );



// Middleware xử lý tất cả các yêu cầu không được định nghĩa (404)
app.use(
  "*",
  catchAsync(async (req, res, next) => {
    throw new AppError(`can't find ${req.originalUrl} on this sever`, 404);
  })
);
app.use(globalErrorHandle);



// Khởi động server

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
