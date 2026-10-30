const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    const server = http.createServer(app);

    // Socket.IO se duoc tich hop vao server o Giai doan P3
    server.listen(PORT, () => {
        console.log("Server Backend dang chay tai: http://localhost:" + PORT);
        console.log("Kiem tra trang thai tai: http://localhost:" + PORT + "/api/health");
    });
};

if (require.main === module) {
    startServer();
}

module.exports = startServer;