const mongoose = require('mongoose');
require('dotenv').config();

//Nhận thêm tham số customUri (tuỳ chọn) để khi cần chạy test trên DB riêng vẫn linh hoạt
const connectDB = async (customUri) => {
    try {
        const uri = customUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SDN302_OrderFood';
        await mongoose.connect(uri);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error("MongoDB connection failed: ", error);
        process.exit(1);
    }
};

module.exports = connectDB;