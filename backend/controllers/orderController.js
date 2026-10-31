const mongoose = require("mongoose");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Table = require("../models/Table");
const Counter = require("../models/Counter");
const { canTransition, STATUS_LABELS } = require("../utils/orderStatus");
const { emitToStaff, emitToOrder } = require("../socket");

const phoneRegex = /^0[0-9]{9}$/;

/**
 * Ham phu: lay chuoi ngay theo gio may chu dang YYYYMMDD
 */
const getDateKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
};

/**
 * Ham phu: sinh ma don tang dan theo ngay, vi du 20261031-001
 */
const generateOrderCode = async () => {
    const dateKey = getDateKey();
    const counter = await Counter.findOneAndUpdate(
        { _id: "order-" + dateKey },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );
    return `${dateKey}-${String(counter.seq).padStart(3, "0")}`;
};

/**
 * 1. Tao don hang moi (Public: khach vang lai hoac khach da dang nhap)
 * Body: { tableCode, customerName, customerPhone, note, items: [{ menuItemId, quantity }] }
 */
exports.createOrder = async (req, res) => {
    try {
        const { tableCode, note, items } = req.body || {};

        // 1.1. Khach da dang nhap thi tu dien ten va SDT tu tai khoan neu khong gui len
        const customerName = (req.body.customerName || (req.user && req.user.name) || "").trim();
        const customerPhone = (req.body.customerPhone || (req.user && req.user.phone) || "").trim();

        if (!customerName) {
            return res.status(400).json({ error: "Vui long nhap ho ten!" });
        }
        if (!phoneRegex.test(customerPhone)) {
            return res.status(400).json({ error: "So dien thoai phai du 10 chu so va bat dau bang so 0!" });
        }

        // 1.2. Kiem tra ban
        if (!tableCode || typeof tableCode !== "string") {
            return res.status(400).json({ error: "Vui long chon ban!" });
        }
        const table = await Table.findOne({ code: tableCode.toUpperCase().trim(), isActive: true });
        if (!table) {
            return res.status(400).json({ error: `Ban [${tableCode}] khong ton tai hoac dang ngung phuc vu!` });
        }

        // 1.3. Kiem tra danh sach mon
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Gio hang dang trong, vui long chon it nhat 1 mon!" });
        }
        if (items.length > 30) {
            return res.status(400).json({ error: "Moi don toi da 30 loai mon!" });
        }

        // 1.4. Gop cac dong trung mon va kiem tra so luong
        const quantityMap = new Map();
        for (const item of items) {
            const id = item && item.menuItemId;
            const qty = Number(item && item.quantity);

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ error: `Ma mon [${id}] khong hop le!` });
            }
            if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
                return res.status(400).json({ error: "So luong moi mon phai la so nguyen tu 1 den 50!" });
            }

            const newQty = (quantityMap.get(String(id)) || 0) + qty;
            if (newQty > 50) {
                return res.status(400).json({ error: "Tong so luong 1 mon khong duoc vuot qua 50!" });
            }
            quantityMap.set(String(id), newQty);
        }

        // 1.5. Lay thong tin mon tu database (1 lan truy van cho tat ca mon)
        const ids = [...quantityMap.keys()];
        const menuItems = await MenuItem.find({ _id: { $in: ids }, isDeleted: false });
        const menuMap = new Map(menuItems.map((m) => [String(m._id), m]));

        // 1.6. Chot gia va tinh tong tien phia server
        const orderItems = [];
        let totalAmount = 0;

        for (const [id, quantity] of quantityMap) {
            const menuItem = menuMap.get(id);
            if (!menuItem) {
                return res.status(400).json({ error: "Co mon khong ton tai hoac da bi xoa khoi thuc don!" });
            }
            if (!menuItem.isAvailable) {
                return res.status(400).json({ error: `Mon [${menuItem.name}] hien da het, vui long chon mon khac!` });
            }

            orderItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                quantity
            });
            totalAmount += menuItem.price * quantity;
        }

        // 1.7. Luu don
        const order = await Order.create({
            orderCode: await generateOrderCode(),
            tableId: table._id,
            tableName: table.name,
            userId: req.user ? req.user._id : null,
            customerName,
            customerPhone,
            note: typeof note === "string" ? note.trim() : "",
            items: orderItems,
            totalAmount,
            status: "pending"
        });

        // 1.8. Bao ngay cho nhan vien co don moi
        emitToStaff("order:new", order);

        return res.status(201).json({
            message: "Gui don thanh cong! Vui long cho quan xac nhan.",
            data: order
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 2. Khach theo doi trang thai don vua gui (Public)
 * Chi tra ve cac truong can thiet, KHONG tra so dien thoai
 */
exports.trackOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Ma don khong dung dinh dang!" });
        }

        const order = await Order.findById(id).select(
            "orderCode tableName items totalAmount status cancelReason note createdAt updatedAt"
        );
        if (!order) {
            return res.status(404).json({ error: "Khong tim thay don hang!" });
        }

        return res.status(200).json({ data: order });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 3. Lich su don cua khach dang dang nhap
 */
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
        return res.status(200).json({
            message: "Lay lich su don thanh cong!",
            total: orders.length,
            data: orders
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 4. Danh sach don cho nhan vien va admin
 * Query: ?status=pending|confirmed|completed|cancelled & date=YYYY-MM-DD (mac dinh hom nay)
 */
exports.getAllOrders = async (req, res) => {
    try {
        const { status, date } = req.query;
        const filter = {};

        if (status) {
            if (!STATUS_LABELS[status]) {
                return res.status(400).json({ error: "Trang thai loc khong hop le!" });
            }
            filter.status = status;
        }

        // Loc theo ngay: tu 00:00 den truoc 00:00 ngay hom sau (theo gio may chu)
        let start = new Date();
        if (date) {
            start = new Date(`${date}T00:00:00`);
            if (isNaN(start.getTime())) {
                return res.status(400).json({ error: "Ngay phai co dang YYYY-MM-DD!" });
            }
        }
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        filter.createdAt = { $gte: start, $lt: end };

        const orders = await Order.find(filter).sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Lay danh sach don thanh cong!",
            total: orders.length,
            data: orders
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * 5. Doi trang thai don (Nhan vien va admin)
 * Body: { status, cancelReason }
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancelReason } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Ma don khong dung dinh dang!" });
        }
        if (!STATUS_LABELS[status]) {
            return res.status(400).json({ error: "Trang thai moi khong hop le!" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: "Khong tim thay don hang!" });
        }

        // 5.1. Kiem tra luong trang thai
        if (!canTransition(order.status, status)) {
            return res.status(400).json({
                error: `Khong the chuyen don tu [${STATUS_LABELS[order.status]}] sang [${STATUS_LABELS[status]}]!`
            });
        }

        // 5.2. Huy don bat buoc co ly do
        if (status === "cancelled") {
            if (!cancelReason || typeof cancelReason !== "string" || cancelReason.trim().length === 0) {
                return res.status(400).json({ error: "Vui long nhap ly do huy don!" });
            }
            order.cancelReason = cancelReason.trim();
        }

        order.status = status;
        await order.save();

        // 5.3. Bao realtime cho nhan vien khac va cho khach dang theo doi don
        const payload = {
            id: order._id,
            orderCode: order.orderCode,
            status: order.status,
            cancelReason: order.cancelReason,
            updatedAt: order.updatedAt
        };
        emitToStaff("order:updated", payload);
        emitToOrder(String(order._id), "order:updated", payload);

        return res.status(200).json({
            message: `Da chuyen don ${order.orderCode} sang [${STATUS_LABELS[status]}]!`,
            data: order
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};