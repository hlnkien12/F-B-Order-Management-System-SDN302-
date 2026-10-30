/**
 * Middleware xử lý lỗi tập trung (4 tham số: err, req, res, next)
 */
const errorHandler = (err, req, res, next) => {
    // 1. Lỗi sai định dạng ObjectId (24 ký tự hex) của Mongoose
    if (err.name === "CastError") {
        return res.status(400).json({
            error: `Định dạng ID không hợp lệ tại trường [${err.path}]!`
        });
    }

    // 2. Lỗi vi phạm ràng buộc Schema Validation của Mongoose
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((val) => val.message);
        return res.status(400).json({
            error: messages.join(" ")
        });
    }

    // 3. Lỗi trùng giá trị unique trong MongoDB (vd: trùng email hoặc mã bàn)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "Trường dữ liệu";
        return res.status(409).json({
            error: `Giá trị của [${field}] đã tồn tại trong hệ thống!`
        });
    }

    // 4. Các lỗi khác do server
    console.error("🔥 [Server Error]:", err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
        error: err.message || "Lỗi hệ thống máy chủ (Internal Server Error)!"
    });
};

module.exports = errorHandler;