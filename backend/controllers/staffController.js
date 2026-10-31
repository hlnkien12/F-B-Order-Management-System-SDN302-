const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

/**
 * 1. Lay danh sach toan bo nhan vien (Chi Admin)
 */
exports.getAllStaff = async (req, res) => {
    try {
        const staffList = await User.find({ role: "staff" })
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Lay danh sach nhan vien thanh cong!",
            total: staffList.length,
            data: staffList
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 2. Admin tao tai khoan nhan vien moi (role bat buoc la 'staff')
 */
exports.createStaff = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body || {};

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ error: "Email nay da ton tai trong he thong!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStaff = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPassword,
            role: "staff",
            isActive: true
        });

        return res.status(201).json({
            message: "Tao tai khoan nhan vien moi thanh cong!",
            data: {
                id: newStaff._id,
                name: newStaff.name,
                email: newStaff.email,
                phone: newStaff.phone,
                role: newStaff.role,
                isActive: newStaff.isActive
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 3. Khoa hoac Mo khoa tai khoan nhan vien (Chi Admin)
 */
exports.toggleStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID nhan vien khong dung dinh dang ObjectId!" });
        }

        const staff = await User.findOne({ _id: id, role: "staff" });
        if (!staff) {
            return res.status(404).json({ error: "Khong tim thay tai khoan nhan vien!" });
        }

        if (req.body && req.body.isActive !== undefined) {
            staff.isActive = Boolean(req.body.isActive);
        } else {
            staff.isActive = !staff.isActive;
        }

        await staff.save();

        const trangThaiText = staff.isActive ? "Dang hoat dong" : "Da bi khoa";
        return res.status(200).json({
            message: `Tai khoan nhan vien [${staff.name}] hien: ${trangThaiText}!`,
            data: {
                id: staff._id,
                name: staff.name,
                isActive: staff.isActive
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 4. Xoa tai khoan nhan vien (Chi Admin)
 */
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID nhan vien khong dung dinh dang ObjectId!" });
        }

        const deleted = await User.findOneAndDelete({ _id: id, role: "staff" });
        if (!deleted) {
            return res.status(404).json({ error: "Khong tim thay nhan vien de xoa!" });
        }

        return res.status(200).json({
            message: `Da xoa tai khoan nhan vien [${deleted.name}] khoi he thong!`,
            data: { id: deleted._id }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

