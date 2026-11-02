const mongoose = require("mongoose");
const Table = require("../models/Table");
const { emitToAll } = require("../socket");

/**
 * 1. Lay danh sach tat ca ban an (Public: Khach xem de chon ban, Admin xem de quan ly)
 */
exports.getAllTables = async (req, res) => {
    try {
        const tables = await Table.find().sort({ code: 1 });
        return res.status(200).json({
            message: "Lay danh sach ban thanh cong!",
            total: tables.length,
            data: tables
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 2. Tra cuu thong tin 1 ban theo Ma ban (vi du: /api/tables/code/T01)
 * Dung khi khach quet ma QR co chua ?table=T01
 */
exports.getTableByCode = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).json({ error: "Ma ban la bat buoc!" });
        }

        const table = await Table.findOne({
            code: code.toUpperCase().trim(),
            isActive: true
        });

        if (!table) {
            return res.status(404).json({ error: `Khong tim thay ban co ma [${code}] hoac ban da ngung su dung!` });
        }

        return res.status(200).json({ data: table });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 3. Them ban an moi (Chi danh cho Admin)
 */
exports.createTable = async (req, res) => {
    try {
        const { code, name } = req.body || {};

        if (!code || typeof code !== "string" || code.trim().length === 0) {
            return res.status(400).json({ error: "Ma ban la bat buoc (vi du: T01, T02)!" });
        }

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({ error: "Ten ban la bat buoc (vi du: Ban 01)!" });
        }

        const formattedCode = code.toUpperCase().trim();

        // Kiem tra trung ma ban
        const existing = await Table.findOne({ code: formattedCode });
        if (existing) {
            return res.status(409).json({ error: `Ma ban [${formattedCode}] da ton tai trong he thong!` });
        }

        const newTable = await Table.create({
            code: formattedCode,
            name: name.trim(),
            isActive: true,
            isOccupied: false
        });

        emitToAll("table:updated", newTable);

        return res.status(201).json({
            message: "Tao ban an moi thanh cong!",
            data: newTable
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * 4. Cap nhat thong tin ban an (Chi danh cho Admin)
 */
exports.updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID ban an khong dung dinh dang ObjectId!" });
        }

        const table = await Table.findById(id);
        if (!table) {
            return res.status(404).json({ error: "Khong tim thay ban can cap nhat!" });
        }

        const { name, isActive, isOccupied } = req.body || {};
        if (name !== undefined) table.name = name.trim();
        if (isActive !== undefined) table.isActive = Boolean(isActive);
        if (isOccupied !== undefined) table.isOccupied = Boolean(isOccupied);

        await table.save();
        emitToAll("table:updated", table);

        return res.status(200).json({
            message: "Cap nhat ban an thanh cong!",
            data: table
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * 5. Dao trang thai Hoat dong / Tam khoa cua ban an (Admin)
 */
exports.toggleTableActive = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID ban an khong dung dinh dang ObjectId!" });
        }

        const table = await Table.findById(id);
        if (!table) {
            return res.status(404).json({ error: "Khong tim thay ban can cap nhat!" });
        }

        table.isActive = !table.isActive;
        if (!table.isActive) {
            table.isOccupied = false;
        }
        await table.save();
        emitToAll("table:updated", table);

        return res.status(200).json({
            message: `Da ${table.isActive ? "kich hoat" : "tam khoa"} ban [${table.code}]!`,
            data: table
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * 6. Cap nhat trang thai Co khach / Ban trong (Nhan vien va Admin)
 * Body: { isOccupied: true | false } (neu khong truyen thi tu dong dao trang thai)
 */
exports.updateTableOccupancy = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID ban an khong dung dinh dang ObjectId!" });
        }

        const table = await Table.findById(id);
        if (!table) {
            return res.status(404).json({ error: "Khong tim thay ban can cap nhat!" });
        }

        const { isOccupied } = req.body || {};
        table.isOccupied = isOccupied !== undefined ? Boolean(isOccupied) : !table.isOccupied;
        await table.save();

        emitToAll("table:updated", table);

        return res.status(200).json({
            message: table.isOccupied
                ? `Ban [${table.code}] da chuyen sang trang thai: Dang co khach!`
                : `Ban [${table.code}] da duoc lam trong, san sang don khach moi!`,
            data: table
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * 7. Xoa ban an (Chi danh cho Admin)
 */
exports.deleteTable = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID ban an khong dung dinh dang ObjectId!" });
        }

        const deleted = await Table.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: "Khong tim thay ban an de xoa!" });
        }

        return res.status(200).json({
            message: `Xoa ban [${deleted.name}] thanh cong!`,
            data: deleted
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
