const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");
const { verifyToken, requireRole } = require("../middlewares/auth");
const sanitizeInput = require("../middlewares/sanitize");

// 1. Cac route cong khai
router.get("/", tableController.getAllTables);
router.get("/code/:code", tableController.getTableByCode);

// 2. Cac route quan tri (Chi danh cho Admin)
router.post("/", verifyToken, requireRole("admin"), sanitizeInput, tableController.createTable);
router.put("/:id", verifyToken, requireRole("admin"), sanitizeInput, tableController.updateTable);
router.delete("/:id", verifyToken, requireRole("admin"), tableController.deleteTable);

module.exports = router;