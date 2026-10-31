const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Table = require("./models/Table");
const MenuItem = require("./models/MenuItem");

const seedData = async () => {
    await connectDB();

    console.log("Bat dau khoi tao du lieu he thong...");

    // 1. Khoi tao tai khoan Admin va Staff
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
    }

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
    }

    // 2. Khoi tao 10 Ban an mau (T01 den T10)
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
        const sampleTables = [];
        for (let i = 1; i <= 10; i++) {
            const code = "T" + (i < 10 ? "0" + i : i);
            sampleTables.push({
                code: code,
                name: "Ban " + (i < 10 ? "0" + i : i),
                isActive: true
            });
        }
        await Table.insertMany(sampleTables);
        console.log("Da tao 10 ban an mau (T01 den T10) thanh cong!");
    } else {
        console.log("Du lieu ban an da ton tai (" + tableCount + " ban).");
    }

    // 3. Khoi tao 16 Mon an va Do uong mau
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
        const sampleItems = [
            // --- DO AN (FOOD) ---
            {
                name: "Pho Bo Tai Lan",
                price: 55000,
                type: "food",
                description: "Pho bo truyen thong nuoc dung ham xuong 12 tieng thom ngon.",
                image: "/images/pho-bo.jpg"
            },
            {
                name: "Bun Dau Mam Tom Thap Cam",
                price: 50000,
                type: "food",
                description: "Dau mo ran gion, thit chan gio luoc, cha com, nem ran va doi sun.",
                image: "/images/bun-dau.jpg"
            },
            {
                name: "Com Tam Suon Bi Cha",
                price: 60000,
                type: "food",
                description: "Suon nuong mat ong dam vi, cha trung hap thom bui.",
                image: "/images/bun-dau.jpg"
            },
            {
                name: "Banh Mi Dac Biet",
                price: 35000,
                type: "food",
                description: "Banh mi pate cot den, thit nguoi, cha lua va sot bami dac trung.",
                image: "/images/pho-bo.jpg"
            },
            {
                name: "Mi Quang Ga Ta",
                price: 45000,
                type: "food",
                description: "Mi quang soi vang ong, thit ga ta thom ngon kem banh trang me.",
                image: "/images/pho-bo.jpg"
            },
            {
                name: "Goi Cuon Tom Thit (3 cuon)",
                price: 40000,
                type: "food",
                description: "Tom tuoi thanh ngot, thit luoc cham tuong den xay thom cay.",
                image: "/images/bun-dau.jpg"
            },
            {
                name: "Bo Luc Lac Khoai Tay",
                price: 85000,
                type: "food",
                description: "Thit bo My xao mem mong nuoc, an kem khoai tay chien gion.",
                image: "/images/pho-bo.jpg"
            },
            {
                name: "Com Chien Hai San",
                price: 65000,
                type: "food",
                description: "Com dao vang gion, tom muc tuoi sot trung muoi thom ngon.",
                image: "/images/bun-dau.jpg"
            },

            // --- DO UONG (DRINK) ---
            {
                name: "Ca Phe Sua Da",
                price: 25000,
                type: "drink",
                description: "Ca phe Robusta pha phin dam da hoa quyen sua dac.",
                image: "/images/tra-sua.jpg"
            },
            {
                name: "Bac Xiu Da",
                price: 28000,
                type: "drink",
                description: "Huong vi ngot ngao beo ngay danh cho tin do it ca phe.",
                image: "/images/tra-sua.jpg"
            },
            {
                name: "Tra Tac Mat Ong",
                price: 35000,
                type: "drink",
                description: "Vi tra thanh mat hoa quyen tac tuoi va mat ong rung.",
                image: "/images/tra-tac.jpg"
            },
            {
                name: "Tra Sua Tran Chau Duong Den",
                price: 40000,
                type: "drink",
                description: "Tran chau dai gion thom mui mia, sua tuoi thanh trung cao cap.",
                image: "/images/tra-sua.jpg"
            },
            {
                name: "Nuoc Ep Cam Tuoi",
                price: 35000,
                type: "drink",
                description: "Cam sanh vat nguyen chat, bo sung vitamin C doi dao.",
                image: "/images/tra-tac.jpg"
            },
            {
                name: "Sinh To Bo Dac Biet",
                price: 45000,
                type: "drink",
                description: "Bo sap Dak Lak dac deo beo ngay kem sua dac thom ngon.",
                image: "/images/tra-sua.jpg"
            },
            {
                name: "Matcha Latte Da",
                price: 42000,
                type: "drink",
                description: "Bot tra xanh Nhat Ban cao cap hoa cung sua tuoi thom mat.",
                image: "/images/tra-sua.jpg"
            },
            {
                name: "Chanh Tuyet Xay",
                price: 30000,
                type: "drink",
                description: "Da bao tuyet hoa quyen nuoc cot chanh chua ngot sang khoai.",
                image: "/images/tra-tac.jpg"
            }
        ];

        await MenuItem.insertMany(sampleItems);
        console.log("Da tao 16 mon an va do uong mau thanh cong!");
    } else {
        console.log("Du lieu thuc don da ton tai (" + menuCount + " mon).");
    }

    console.log("Hoan thanh qua trinh seed toan dien!");
    process.exit(0);
};

seedData();
