const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

const seedAccounts = async () => {
    await connectDB();

    console.log("Bat dau khoi tao tai khoan mac dinh...");

    // 1. Khoi tao Admin mac dinh neu chua co
    const adminExists = await User.findOne({ email: "admin@shop.com" });
    if (!adminExists) {
        const hash = await bcrypt.hash("admin123", 10);
        await User.create({
            name: "Quan Tri Vien",
            email: "admin@shop.com",
            phone: "0901234567",
            password: hash,
            role: "admin",
            isActive: true
        });
        console.log("Da tao tai khoan Admin: admin@shop.com / admin123");
    } else {
        console.log("Tai khoan Admin da ton tai!");
    }

    // 2. Khoi tao Nhan vien mac dinh neu chua co
    const staffExists = await User.findOne({ email: "staff@shop.com" });
    if (!staffExists) {
        const hash = await bcrypt.hash("staff123", 10);
        await User.create({
            name: "Nhan Vien Thu Ngan",
            email: "staff@shop.com",
            phone: "0907654321",
            password: hash,
            role: "staff",
            isActive: true
        });
        console.log("Da tao tai khoan Staff: staff@shop.com / staff123");
    } else {
        console.log("Tai khoan Staff da ton tai!");
    }

    console.log("Hoan thanh qua trinh seed!");
    process.exit(0);
};

seedAccounts();