const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { verifyToken, requireRole } = require("../middlewares/auth");
const sanitizeInput = require("../middlewares/sanitize");

// 1. Cac route cong khai (Khach hang va tat ca moi nguoi deu xem duoc)
router.get("/", menuController.getAllMenuItems);
router.get("/:id", menuController.getMenuItemById);

// 2. Route cap nhat trang thai con/het mon (Nhan vien va Admin)
router.patch("/:id/availability", verifyToken, requireRole("staff", "admin"), menuController.toggleAvailability);

// 3. Cac route quan tri CRUD thuc don (Chi danh cho Admin)
router.post("/", verifyToken, requireRole("admin"), sanitizeInput, menuController.createMenuItem);
router.put("/:id", verifyToken, requireRole("admin"), sanitizeInput, menuController.updateMenuItem);
router.delete("/:id", verifyToken, requireRole("admin"), menuController.deleteMenuItem);

module.exports = router;