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

// 4. Khach vang lai tra cuu danh sach don theo session may (Public)
router.post("/batch-track", sanitizeInput, orderController.getBatchOrdersTrack);

// 5. Khach hang tu huy don khi con dang pending (Public)
router.post("/:id/cancel", sanitizeInput, orderController.cancelOrderByCustomer);

// 6. Khach hang bam Goi Thanh Toan tai ban (Public)
router.post("/request-payment", sanitizeInput, orderController.requestPayment);

// 7. Nhan vien va admin quan ly don
router.get("/", verifyToken, requireRole("staff", "admin"), orderController.getAllOrders);
router.patch("/:id/status", verifyToken, requireRole("staff", "admin"), sanitizeInput, orderController.updateOrderStatus);
router.post("/settle-table", verifyToken, requireRole("staff", "admin"), sanitizeInput, orderController.settleTableOrders);

module.exports = router;
