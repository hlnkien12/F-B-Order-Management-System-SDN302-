// Dinh dang email chuan
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dinh dang so dien thoai Viet Nam: 10 chu so bat dau bang 0
const phoneRegex = /^0[0-9]{9}$/;

/**
 * 1. Kiem tra du lieu dang ky
 */
const validateRegister = (req, res, next) => {
    const { name, email, password, phone } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Ho ten la bat buoc va khong duoc de trong!" });
    }

    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: "Email khong dung dinh dang hop le!" });
    }

    if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json({ error: "So dien thoai phai du 10 chu so va bat dau bang so 0!" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Mat khau phai co it nhat 6 ky tu!" });
    }

    next();
};

/**
 * 2. Kiem tra du lieu dang nhap
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body || {};

    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: "Email dang nhap khong hop le!" });
    }

    if (!password || typeof password !== "string" || password.length === 0) {
        return res.status(400).json({ error: "Vui long nhap mat khau!" });
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin
};