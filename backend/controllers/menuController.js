const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const { emitToAll } = require("../socket");

/**
 * 1. Lay danh sach thuc don (Public: Khach hang, Nhan vien, Admin)
 * Query ho tro: ?type=food|drink & search=ten_mon
 */
exports.getAllMenuItems = async (req, res) => {
    try {
        const { type, search } = req.query;
        const filter = { isDeleted: false };

        // Loc theo loai: food hoac drink
        if (type && ["food", "drink"].includes(type.toLowerCase())) {
            filter.type = type.toLowerCase();
        }

        // Tim kiem theo ten mon (khong phan biet hoa thuong)
        if (search && search.trim().length > 0) {
            filter.name = { $regex: search.trim(), $options: "i" };
        }

        const items = await MenuItem.find(filter).sort({ type: 1, name: 1 });
        return res.status(200).json({
            message: "Lay danh sach thuc don thanh cong!",
            total: items.length,
            data: items
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 2. Lay chi tiet 1 mon an/do uong theo ID (Public)
 */
exports.getMenuItemById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID mon an khong dung dinh dang ObjectId!" });
        }

        const item = await MenuItem.findOne({ _id: id, isDeleted: false });
        if (!item) {
            return res.status(404).json({ error: "Khong tim thay mon an hoac mon da bi xoa!" });
        }

        return res.status(200).json({ data: item });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 3. Them mon an/do uong moi (Chi danh cho Admin)
 */
exports.createMenuItem = async (req, res) => {
    try {
        const { name, price, image, description, type, options } = req.body || {};

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({ error: "Ten mon la bat buoc!" });
        }

        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ error: "Gia ban phai la so lon hon hoac bang 0!" });
        }

        if (!type || !["food", "drink"].includes(type.toLowerCase())) {
            return res.status(400).json({ error: "Loai mon bat buoc phai la 'food' hoac 'drink'!" });
        }

        const newItem = await MenuItem.create({
            name: name.trim(),
            price: numPrice,
            image: image && image.trim().length > 0 ? image.trim() : undefined,
            description: description ? description.trim() : "",
            type: type.toLowerCase(),
            options: Array.isArray(options) && options.length > 0 ? options : undefined
        });

        return res.status(201).json({
            message: "Them mon moi vao thuc don thanh cong!",
            data: newItem
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * 4. Cap nhat thong tin mon an (Chi danh cho Admin)
 */
exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID mon an khong dung dinh dang ObjectId!" });
        }

        const item = await MenuItem.findOne({ _id: id, isDeleted: false });
        if (!item) {
            return res.status(404).json({ error: "Khong tim thay mon can cap nhat!" });
        }

        // Whitelist chi cho phep sua cac truong hop le
        const { name, price, image, description, type, isAvailable, options } = req.body || {};
        if (name !== undefined) item.name = name.trim();
        if (price !== undefined) {
            const numPrice = Number(price);
            if (isNaN(numPrice) || numPrice < 0) {
                return res.status(400).json({ error: "Gia ban phai la so >= 0!" });
            }
            item.price = numPrice;
        }
        if (image !== undefined) item.image = image.trim();
        if (description !== undefined) item.description = description.trim();
        if (type !== undefined) {
            if (!["food", "drink"].includes(type.toLowerCase())) {
                return res.status(400).json({ error: "Loai mon phai la 'food' hoac 'drink'!" });
            }
            item.type = type.toLowerCase();
        }
        if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
        if (options !== undefined && Array.isArray(options)) {
            item.options = options;
        }

        await item.save();

        return res.status(200).json({
            message: "Cap nhat mon thanh cong!",
            data: item
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * 5. Bat/Tat trang thai con mon hoac het mon (Nhan vien va Admin deu duoc phep)
 */
exports.toggleAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID mon an khong dung dinh dang ObjectId!" });
        }

        const item = await MenuItem.findOne({ _id: id, isDeleted: false });
        if (!item) {
            return res.status(404).json({ error: "Khong tim thay mon an!" });
        }

        // Neu client truyen truc tiep gia tri isAvailable thi lay theo do, neu khong thi dao trang thai
        if (req.body && req.body.isAvailable !== undefined) {
            item.isAvailable = Boolean(req.body.isAvailable);
        } else {
            item.isAvailable = !item.isAvailable;
        }

        await item.save();

        // Bao cho moi may dang mo thuc don biet mon nay vua doi trang thai
        emitToAll("menu:updated", { id: item._id, isAvailable: item.isAvailable });

        const trangThaiText = item.isAvailable ? "Con mon" : "Het mon";
        return res.status(200).json({
            message: `Da chuyen trang thai mon sang: [${trangThaiText}]!`,
            data: {
                id: item._id,
                name: item.name,
                isAvailable: item.isAvailable
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 6. Xoa mem mon khoi thuc don (Chi danh cho Admin)
 */
exports.deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "ID mon an khong dung dinh dang ObjectId!" });
        }

        const item = await MenuItem.findOne({ _id: id, isDeleted: false });
        if (!item) {
            return res.status(404).json({ error: "Khong tim thay mon an de xoa!" });
        }

        // Xoa mem: Danh dau isDeleted = true
        item.isDeleted = true;
        await item.save();

        return res.status(200).json({
            message: `Xoa mon [${item.name}] khoi thuc don thanh cong!`,
            data: { id: item._id }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
