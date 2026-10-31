// Chay: node tests/socket_listener.js
// Yeu cau: backend dang chay va da cai socket.io-client (npm install -D socket.io-client)
const { io } = require("socket.io-client");

const BASE_URL = "http://localhost:5000";

const start = async () => {
    // 1. Dang nhap tai khoan staff de lay access token
    const res = await fetch(BASE_URL + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "staff@shop.com", password: "staff123" })
    });
    const body = await res.json();
    if (!res.ok) {
        console.error("Dang nhap that bai:", body.error);
        process.exit(1);
    }

    // 2. Ket noi socket kem token de duoc vao room "staff"
    const socket = io(BASE_URL, { auth: { token: body.data.accessToken } });

    socket.on("connect", () => {
        console.log("Da ket noi socket. Dang cho don moi... (Ctrl + C de thoat)");
    });

    // 3. In ra cac su kien nhan duoc
    socket.on("order:new", (order) => {
        console.log(`[order:new] Don ${order.orderCode} - ${order.tableName} - Tong ${order.totalAmount}`);
    });

    socket.on("order:updated", (data) => {
        console.log(`[order:updated] Don ${data.orderCode} -> ${data.status}`);
    });

    socket.on("menu:updated", (data) => {
        console.log(`[menu:updated] Mon ${data.id} -> isAvailable = ${data.isAvailable}`);
    });

    socket.on("connect_error", (err) => {
        console.error("Loi ket noi socket:", err.message);
    });
};

start();