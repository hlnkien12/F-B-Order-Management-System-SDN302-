const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    // 1. Tao HTTP server tu Express app
    const server = http.createServer(app);

    // 2. Gan Socket.IO vao cung HTTP server (dung chung cong 5000)
    initSocket(server);

    server.listen(PORT, () => {
        console.log("Server Backend dang chay tai: http://localhost:" + PORT);
        console.log("Kiem tra trang thai tai: http://localhost:" + PORT + "/api/health");
    });
};

if (require.main === module) {
    startServer();
}

module.exports = startServer;