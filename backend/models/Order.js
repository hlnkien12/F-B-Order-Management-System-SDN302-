const mongoose = require("mongoose");

// 1. Tung mon trong don (khong can _id rieng)
const orderItemSchema = new mongoose.Schema(
    {
        menuItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MenuItem",
            required: true
        },
        name: {
            type: String,
            required: true
        },
        selectedOption: {
            type: String,
            default: "",
            trim: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "So luong toi thieu la 1!"],
            max: [50, "So luong toi da moi mon la 50!"]
        }
    },
    { _id: false }
);

// 2. Don hang
const orderSchema = new mongoose.Schema(
    {
        orderCode: {
            type: String,
            required: true,
            unique: true
        },
        tableId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Table",
            required: true
        },
        tableName: {
            type: String,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null // null = khach vang lai
        },
        customerName: {
            type: String,
            default: "Khach tai ban",
            trim: true
        },
        customerPhone: {
            type: String,
            default: "",
            trim: true
        },
        note: {
            type: String,
            default: "",
            trim: true,
            maxlength: [300, "Ghi chu toi da 300 ky tu!"]
        },
        items: {
            type: [orderItemSchema],
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "Don hang phai co it nhat 1 mon!"
            }
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "served", "completed", "cancelled"],
            default: "pending"
        },
        paymentRequested: {
            type: Boolean,
            default: false
        },
        paymentMethod: {
            type: String,
            enum: ["", "cash", "transfer"],
            default: ""
        },
        cancelReason: {
            type: String,
            default: ""
        },
        changeTableReason: {
            type: String,
            default: "",
            trim: true
        },
        feedback: {
            rating: {
                type: Number,
                min: 1,
                max: 5,
                default: null
            },
            issueCategory: {
                type: String,
                enum: ["none", "staff", "ingredient", "both"],
                default: "none"
            },
            comment: {
                type: String,
                default: "",
                trim: true,
                maxlength: [500, "Noi dung phan hoi toi da 500 ky tu!"]
            },
            isBadFeedback: {
                type: Boolean,
                default: false
            },
            submittedAt: {
                type: Date,
                default: null
            }
        },
        voidRefund: {
            isProcessed: {
                type: Boolean,
                default: false
            },
            actionType: {
                type: String,
                enum: ["", "void", "full_refund", "partial_refund"],
                default: ""
            },
            incidentCategory: {
                type: String,
                enum: ["", "staff", "ingredient", "both"],
                default: ""
            },
            refundAmount: {
                type: Number,
                default: 0,
                min: 0
            },
            reason: {
                type: String,
                default: "",
                trim: true
            },
            processedBy: {
                type: String,
                default: ""
            },
            processedAt: {
                type: Date,
                default: null
            }
        }
    },
    { timestamps: true }
);

// 3. Index phuc vu loc don theo trang thai, theo ngay va lich su don cua khach
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema, "orders");
