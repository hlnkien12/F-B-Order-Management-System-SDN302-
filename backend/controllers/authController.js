const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const {
    signAccessToken,
    createRefreshToken,
    hashToken,
    setRefreshTokenCookie,
    clearRefreshTokenCookie
} = require("../utils/token");

/**
 * 1. Dang ky tai khoan khach hang (role luon luon la 'user')
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: "Email nay da duoc dang ky trong he thong!" });
        }

        // Ma hoa mat khau 10 salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPassword,
            role: "user"
        });

        return res.status(201).json({
            message: "Dang ky tai khoan thanh cong!",
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 2. Dang nhap he thong (Dung chung cho user, staff, admin)
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Lay kem truong password vi model co select: false
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
        if (!user) {
            return res.status(401).json({ error: "Email hoac mat khau khong chinh xac!" });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: "Tai khoan cua ban da bi khoa!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Email hoac mat khau khong chinh xac!" });
        }

        // Tao Access Token va Refresh Token
        const accessToken = signAccessToken(user);
        const rawRefreshToken = createRefreshToken();
        const tokenHash = hashToken(rawRefreshToken);

        const days = Number(process.env.REFRESH_EXPIRES_DAYS) || 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // Luu ban ghi vao database
        await RefreshToken.create({
            userId: user._id,
            tokenHash,
            expiresAt
        });

        // Gui Refresh Token qua httpOnly Cookie
        setRefreshTokenCookie(res, rawRefreshToken);

        return res.status(200).json({
            message: "Dang nhap thanh cong!",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                },
                accessToken
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 3. Lam moi Access Token (Rotate Refresh Token de tranh lo token cu)
 */
exports.refresh = async (req, res) => {
    try {
        const rawRefreshToken = req.cookies.refreshToken;
        if (!rawRefreshToken) {
            return res.status(401).json({ error: "Thieu Refresh Token trong Cookie!" });
        }

        const incomingHash = hashToken(rawRefreshToken);
        const storedRecord = await RefreshToken.findOne({ tokenHash: incomingHash });

        if (!storedRecord) {
            clearRefreshTokenCookie(res);
            return res.status(401).json({ error: "Refresh Token khong hop le hoac da bi thu hoi!" });
        }

        const user = await User.findById(storedRecord.userId);
        if (!user || !user.isActive) {
            await RefreshToken.deleteOne({ _id: storedRecord._id });
            clearRefreshTokenCookie(res);
            return res.status(403).json({ error: "Nguoi dung khong hop le hoac tai khoan da bi khoa!" });
        }

        // Xoay vong: Xoa token cu, cap phat token moi
        await RefreshToken.deleteOne({ _id: storedRecord._id });

        const newAccessToken = signAccessToken(user);
        const newRawRefreshToken = createRefreshToken();
        const newHash = hashToken(newRawRefreshToken);

        const days = Number(process.env.REFRESH_EXPIRES_DAYS) || 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await RefreshToken.create({
            userId: user._id,
            tokenHash: newHash,
            expiresAt
        });

        setRefreshTokenCookie(res, newRawRefreshToken);

        return res.status(200).json({
            message: "Lam moi token thanh cong!",
            data: {
                accessToken: newAccessToken
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 4. Dang xuat he thong
 */
exports.logout = async (req, res) => {
    try {
        const rawRefreshToken = req.cookies.refreshToken;
        if (rawRefreshToken) {
            const incomingHash = hashToken(rawRefreshToken);
            await RefreshToken.deleteOne({ tokenHash: incomingHash });
        }
        clearRefreshTokenCookie(res);
        return res.status(200).json({ message: "Dang xuat thanh cong!" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 5. Lay thong tin tai khoan hien tai
 */
exports.getMe = async (req, res) => {
    return res.status(200).json({
        data: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            role: req.user.role
        }
    });
};