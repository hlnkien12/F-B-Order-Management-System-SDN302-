const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tokenHash: {
        type: String,
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 0 // TTL index: MongoDB tu dong xoa ban ghi khi den thoi gian expiresAt
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema, "refresh_tokens");