const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

let io = null;

/**
 * 1. Khoi tao Socket.IO gan vao HTTP server
 */
const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            credentials: true
        }
    });

    // 2. Doc token (neu co) khi ket noi. Token sai thi van cho ket noi nhung coi nhu khach
    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (token) {
            try {
                socket.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            } catch (err) {
                socket.user = null;
            }
        }
        next();
    });

    io.on("connection", (socket) => {
        // 3. Nhan vien va admin tu dong vao room "staff" de nhan don moi
        if (socket.user && ["staff", "admin"].includes(socket.user.role)) {
            socket.join("staff");
            console.log("[Socket] Nhan vien ket noi: " + socket.user.email);
        }

        // 4. Khach theo doi 1 don cu the
        socket.on("order:join", (orderId) => {
            if (mongoose.isValidObjectId(orderId)) {
                socket.join("order:" + orderId);
            }
        });

        // 5. Khach roi trang theo doi don
        socket.on("order:leave", (orderId) => {
            socket.leave("order:" + orderId);
        });
    });

    console.log("[Socket] Socket.IO da san sang");
    return io;
};

/**
 * 6. Cac ham gui su kien (neu socket chua khoi tao thi bo qua, khong lam loi API)
 */
const emitToStaff = (event, data) => {
    if (io) io.to("staff").emit(event, data);
};

const emitToOrder = (orderId, event, data) => {
    if (io) io.to("order:" + orderId).emit(event, data);
};

const emitToAll = (event, data) => {
    if (io) io.emit(event, data);
};

module.exports = {
    initSocket,
    emitToStaff,
    emitToOrder,
    emitToAll
};