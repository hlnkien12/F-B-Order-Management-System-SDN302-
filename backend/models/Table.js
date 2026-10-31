const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, "Ma ban la bat buoc (vi du: T01, T02)!"],
            unique: true,
            uppercase: true,
            trim: true
        },
        name: {
            type: String,
            required: [true, "Ten ban la bat buoc (vi du: Ban 01)!"],
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Table", tableSchema, "tables");