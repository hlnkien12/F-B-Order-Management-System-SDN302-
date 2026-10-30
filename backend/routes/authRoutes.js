const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const sanitizeInput = require("../middlewares/sanitize");
const { validateRegister, validateLogin } = require("../middlewares/validate");
const { verifyToken } = require("../middlewares/auth");

router.post("/register", sanitizeInput, validateRegister, authController.register);
router.post("/login", sanitizeInput, validateLogin, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", verifyToken, authController.getMe);

module.exports = router;