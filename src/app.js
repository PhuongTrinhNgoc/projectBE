require("dotenv").config({ path: `${process.cwd()}` });
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const authRouter = require("./route/authRouter");
const useRouter = require("./route/userRouter");
const projectRoute = require("./route/projectRoute");
const adminRouter = require("./route/adminRouter");
const uploadRoutes = require('./route/uploadRoutes');
const catchAsync = require("./utils/catchAsync");
const AppError = require("./utils/appError");
const globalErrorHandle = require("./controller/errorController");
// Middleware để parse dữ liệu JSON
app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRoute);
app.use("/api/v1/users",useRouter );
app.use("/api/v1/admin",adminRouter );
app.use('/api/uploads', uploadRoutes);



// Middleware xử lý tất cả các yêu cầu không được định nghĩa (404)
app.use(
  "*",
  catchAsync(async (req, res, next) => {
    throw new AppError(`can't find ${req.originalUrl} on this sever`, 404);
  })
);
app.use(globalErrorHandle);



// Khởi động server

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
