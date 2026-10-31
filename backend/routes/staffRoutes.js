const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { verifyToken, requireRole } = require("../middlewares/auth");
const { validateRegister } = require("../middlewares/validate");
const sanitizeInput = require("../middlewares/sanitize");

// Tat ca cac route nhan vien deu chi danh rieng cho Admin
router.use(verifyToken, requireRole("admin"));

router.get("/", staffController.getAllStaff);
router.post("/", sanitizeInput, validateRegister, staffController.createStaff);
router.patch("/:id/status", sanitizeInput, staffController.toggleStaffStatus);
router.delete("/:id", staffController.deleteStaff);

module.exports = router;

