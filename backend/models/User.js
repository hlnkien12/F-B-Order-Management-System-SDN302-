const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Ho ten la bat buoc!"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Email la bat buoc!"],
            unique: true,
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            required: [true, "So dien thoai la bat buoc!"],
            trim: true
        },
        password: {
            type: String,
            required: function () {
                // Neu dang nhap bang Google thi khong can password
                return !this.googleId;
            },
            select: false // Mac dinh khong tra mat khau khi find()
        },
        googleId: {
            type: String,
            default: null
        },
        role: {
            type: String,
            enum: ["user", "staff", "admin"],
            default: "user"
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema, "users");