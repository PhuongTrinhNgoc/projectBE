require("dotenv").config({ path: `${process.cwd()}` });
const express = require("express");
const app = express();

const authRouter = require("./route/authRouter");
const useRouter = require("./route/userRouter");
const projectRoute = require("./route/projectRoute");
const catchAsync = require("./utils/catchAsync");
const AppError = require("./utils/appError");
const globalErrorHandle = require("./controller/errorController");

// Middleware để parse dữ liệu JSON
app.use(express.json());

// Route cho trang chủ


// Sử dụng authRouter cho các route liên quan tới /auth
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRoute);
app.use("/api/v1/users",useRouter );

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