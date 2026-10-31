const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const connectDB = require("./config/db");
const MenuItem = require("./models/MenuItem");

const imageMap = {
    "Pho Bo Tai Lan": "/images/pho-bo.jpg",
    "Bun Dau Mam Tom Thap Cam": "/images/bun-dau.jpg",
    "Bun Cha Ha Noi": "/images/bun-dau.jpg",
    "Com Tam Suon Bi Cha": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500",
    "Banh Mi Dac Biet": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500",
    "Mi Quang Ga Ta": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500",
    "Goi Cuon Tom Thit (3 cuon)": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500",
    "Bo Luc Lac Khoai Tay": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500",
    "Com Chien Hai San": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500",
    "Ca Phe Sua Da": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
    "Bac Xiu Da": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500",
    "Tra Tac Mat Ong": "/images/tra-tac.jpg",
    "Tra Dao Cam Sa": "/images/tra-tac.jpg",
    "Tra Sua Tran Chau Duong Den": "/images/tra-sua.jpg",
    "Nuoc Ep Cam Tuoi": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500",
    "Sinh To Bo Dac Biet": "https://images.unsplash.com/photo-1638176066666-ffb2f5d222e9?w=500",
    "Matcha Latte Da": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500",
    "Chanh Tuyet Xay": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500"
};

async function updateImages() {
    await connectDB();
    console.log("Bat dau cap nhat hinh anh cho cac mon trong database...");
    let updatedCount = 0;
    for (const [name, img] of Object.entries(imageMap)) {
        const res = await MenuItem.updateMany(
            { name: { $regex: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") } },
            { $set: { image: img } }
        );
        updatedCount += res.modifiedCount;
        console.log(`- Mon [${name}]: da gan anh ${img}`);
    }
    console.log(`Hoan thanh! Tong cong da cap nhat anh cho ${updatedCount} mon trong Database.`);
    process.exit(0);
}

updateImages().catch((err) => {
    console.error("Loi:", err);
    process.exit(1);
});

