const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// 1. Cấu hình CORS cho phép gửi kèm httpOnly Cookie từ Frontend
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    })
);

// 2. Middleware đọc JSON body và đọc Cookie
app.use(express.json());
app.use(cookieParser());

// 3. Endpoint kiểm tra trạng thái server (Health Check)
app.get("/api/health", (req, res) => {
    res.status(200).json({
        message: "Server F&B Order đang hoạt động tốt!",
        data: { status: "OK", timestamp: new Date().toISOString() }
    });
});

// --- CÁC ROUTES CHÍNH SẼ ĐƯỢC GẮN TẠI ĐÂY Ở P1, P2, P3, P4 ---

// 4. Bắt lỗi 404 cho mọi đường dẫn không tồn tại
app.use((req, res) => {
    res.status(404).json({
        error: `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại trên server!`
    });
});

// 5. Middleware xử lý lỗi tập trung
app.use(errorHandler);

module.exports = app;