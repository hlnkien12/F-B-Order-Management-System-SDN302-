const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * 1. Ky Access Token (thoi han ngan, mac dinh 15m)
 */
const signAccessToken = (user) => {
    const payload = {
        id: user._id || user.id,
        role: user.role,
        name: user.name,
        email: user.email
    };
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.ACCESS_EXPIRES || "15m"
    });
};

/**
 * 2. Tao chuoi Refresh Token ngau nhien 40 bytes hex
 */
const createRefreshToken = () => {
    return crypto.randomBytes(40).toString("hex");
};

/**
 * 3. Bam chuoi token bang thuat toan SHA-256 truoc khi luu database
 */
const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * 4. Dat Cookie httpOnly cho Refresh Token (an toan, chong XSS)
 */
const setRefreshTokenCookie = (res, token) => {
    const days = Number(process.env.REFRESH_EXPIRES_DAYS) || 7;
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: false, // Dat true neu chay HTTPS tren production
        sameSite: "strict",
        path: "/api/auth",
        maxAge: days * 24 * 60 * 60 * 1000
    });
};

/**
 * 5. Xoa Cookie khi logout
 */
const clearRefreshTokenCookie = (res) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "strict",
        path: "/api/auth"
    });
};

module.exports = {
    signAccessToken,
    createRefreshToken,
    hashToken,
    setRefreshTokenCookie,
    clearRefreshTokenCookie
};