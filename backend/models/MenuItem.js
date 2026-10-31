const mongoose = require("mongoose");

const getDefaultOptions = (type) => {
    if (type === "drink") {
        return [
            { label: "Size M", priceDelta: 0 },
            { label: "Size L", priceDelta: 5000 },
            { label: "Size XL", priceDelta: 10000 }
        ];
    }
    return [
        { label: "Thường", priceDelta: 0 },
        { label: "Đặc biệt", priceDelta: 15000 }
    ];
};

const menuItemOptionSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true
        },
        priceDelta: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    { _id: false }
);

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
        options: {
            type: [menuItemOptionSchema],
            default: undefined
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
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                if (!Array.isArray(ret.options) || ret.options.length === 0) {
                    ret.options = getDefaultOptions(ret.type);
                }
                return ret;
            }
        },
        toObject: {
            transform: (_doc, ret) => {
                if (!Array.isArray(ret.options) || ret.options.length === 0) {
                    ret.options = getDefaultOptions(ret.type);
                }
                return ret;
            }
        }
    }
);

menuItemSchema.pre("save", function () {
    if (!Array.isArray(this.options) || this.options.length === 0) {
        this.options = getDefaultOptions(this.type);
    }
});

menuItemSchema.statics.getDefaultOptions = getDefaultOptions;
menuItemSchema.statics.getEffectiveOptions = function (item) {
    if (item && Array.isArray(item.options) && item.options.length > 0) {
        return item.options;
    }
    return getDefaultOptions(item ? item.type : "food");
};

// Danh index ho tro tim kiem va loc nhanh
menuItemSchema.index({ type: 1, isDeleted: 1 });
menuItemSchema.index({ name: "text" });

module.exports = mongoose.model("MenuItem", menuItemSchema, "menu_items");
