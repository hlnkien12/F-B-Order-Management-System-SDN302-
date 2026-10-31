const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, optionalAuth, requireRole } = require("../middlewares/auth");
const sanitizeInput = require("../middlewares/sanitize");
const { orderRateLimiter } = require("../middlewares/rateLimit");

// 1. Khach gui don (co token thi gan vao tai khoan, khong co thi la khach vang lai)
router.post("/", orderRateLimiter, optionalAuth, sanitizeInput, orderController.createOrder);

// 2. Khach dang nhap xem lich su don cua minh
router.get("/my", verifyToken, orderController.getMyOrders);

// 3. Khach theo doi 1 don (Public)
router.get("/:id/track", orderController.trackOrder);

// 4. Nhan vien va admin quan ly don
router.get("/", verifyToken, requireRole("staff", "admin"), orderController.getAllOrders);
router.patch("/:id/status", verifyToken, requireRole("staff", "admin"), sanitizeInput, orderController.updateOrderStatus);

module.exports = router;