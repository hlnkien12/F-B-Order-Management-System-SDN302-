const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/errorHandler");

// Import cac Routers
const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const tableRoutes = require("./routes/tableRoutes");

const app = express();

// 1. Cau hinh CORS cho phep gui kem httpOnly Cookie tu Frontend
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    })
);

// 2. Middleware doc JSON body va doc Cookie
app.use(express.json());
app.use(cookieParser());

// 3. Endpoint kiem tra trang thai server (Health Check)
app.get("/api/health", (req, res) => {
    res.status(200).json({
        message: "Server F&B Order dang hoat dong tot!",
        data: { status: "OK", timestamp: new Date().toISOString() }
    });
});

// 4. Gan cac routes chuc nang
app.use("/api/auth", authRoutes);
app.use("/api/menu-items", menuRoutes);
app.use("/api/tables", tableRoutes);

// 5. Bat loi 404 cho moi duong dan khong ton tai
app.use((req, res) => {
    res.status(404).json({
        error: `Duong dan [${req.method}] ${req.originalUrl} khong ton tai tren server!`
    });
});

// 6. Middleware xu ly loi tap trung
app.use(errorHandler);

module.exports = app;