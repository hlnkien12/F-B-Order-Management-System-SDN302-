const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Ten mon an/do uong la bat buoc!"],
            trim: true
        },
        price: {
            type: Number,
            required: [true, "Gia ban la bat buoc!"],
            min: [0, "Gia ban phai lon hon hoac bang 0!"]
        },
        image: {
            type: String,
            default: "https://placehold.co/400x300?text=Food+Drink"
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        type: {
            type: String,
            enum: {
                values: ["food", "drink"],
                message: "Loai mon chi duoc phep la 'food' hoac 'drink'!"
            },
            required: [true, "Loai mon (food hoac drink) la bat buoc!"]
        },
        isAvailable: {
            type: Boolean,
            default: true // Mac dinh con mon
        },
        isDeleted: {
            type: Boolean,
            default: false // Xoa mem de khong lam hong lich su don cu
        }
    },
    { timestamps: true }
);

// Danh index ho tro tim kiem va loc nhanh
menuItemSchema.index({ type: 1, isDeleted: 1 });
menuItemSchema.index({ name: "text" });

module.exports = mongoose.model("MenuItem", menuItemSchema, "menu_items");