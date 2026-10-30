const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 1. Bat buoc phai co Access Token hop le moi duoc di tiep
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Chua dang nhap: Thieu token xac thuc!" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Kiem tra user con ton tai va con hoat dong khong
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "Tai khoan khong con ton tai trong he thong!" });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: "Tai khoan cua ban da bi khoa boi quan tri vien!" });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Access token da het han, vui long lam moi token!" });
        }
        return res.status(401).json({ error: "Token xac thuc khong hop le!" });
    }
};

/**
 * 2. Token tuy chon (Dung cho Khach hang dat mon: co tai khoan thi luu lai, vang lai thi bo qua)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await User.findById(decoded.id);
            if (user && user.isActive) {
                req.user = user;
            }
        }
    } catch (err) {
        // Khong chan request neu token tuy chon loi, coi nhu khach vang lai
        req.user = null;
    }
    next();
};

/**
 * 3. Phan quyen theo vai tro (Vi du: requireRole('admin') hoac requireRole('staff', 'admin'))
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Yeu cau dang nhap de thuc hien chuc nang nay!" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Ban khong co quyen truy cap! Yeu cau quyen: [${roles.join(", ")}]`
            });
        }

        next();
    };
};

module.exports = {
    verifyToken,
    optionalAuth,
    requireRole
};