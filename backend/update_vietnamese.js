const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const connectDB = require("./config/db");
const MenuItem = require("./models/MenuItem");
const Table = require("./models/Table");

const VIETNAMESE_ITEMS = [
    {
        pattern: /pho bo/i,
        name: "Ph\u1edf B\u00f2 T\u00e1i L\u0103n",
        description: "Ph\u1edf b\u00f2 truy\u1ec1n th\u1ed1ng n\u01b0\u1edbc d\u00f9ng h\u1ea7m x\u01b0\u01a1ng 12 ti\u1ebfng th\u01a1m ngon."
    },
    {
        pattern: /bun dau/i,
        name: "B\u00fan \u0110\u1eadu M\u1eafm T\u00f4m Th\u1eadp C\u1ea9m",
        description: "\u0110\u1eadu m\u01a1 r\u00e1n gi\u00f2n, th\u1ecbt ch\u00e2n gi\u00f2 lu\u1ed9c, ch\u1ea3 c\u1ed1m, nem r\u00e1n v\u00e0 d\u1ed3i s\u1ee5n."
    },
    {
        pattern: /bun cha/i,
        name: "B\u00fan Ch\u1ea3 H\u00e0 N\u1ed9i",
        description: "Ch\u1ea3 n\u01b0\u1edbng than hoa th\u01a1m l\u1eebng, k\u00e8m nem r\u00e1n gi\u00f2n r\u1ee5m v\u00e0 rau s\u1ed1ng."
    },
    {
        pattern: /com tam/i,
        name: "C\u01a1m T\u1ea5m S\u01b0\u1eddn B\u00ec Ch\u1ea3",
        description: "S\u01b0\u1eddn n\u01b0\u1edbng m\u1eadt ong \u0111\u1eadm v\u1ecb, ch\u1ea3 tr\u1ee9ng h\u1ea5p th\u01a1m b\u00f9i."
    },
    {
        pattern: /banh mi/i,
        name: "B\u00e1nh M\u00ec \u0110\u1eb7c Bi\u1ec7t",
        description: "B\u00e1nh m\u00ec pate c\u1ed9t \u0111\u00e8n, th\u1ecbt ngu\u1ed9i, ch\u1ea3 l\u1ee5a v\u00e0 s\u1ed1t bami \u0111\u1eb7c tr\u01b0ng."
    },
    {
        pattern: /mi quang/i,
        name: "M\u00ec Qu\u1ea3ng G\u00e0 Ta",
        description: "M\u00ec Qu\u1ea3ng s\u1ee3i v\u00e0ng \u00f3ng, th\u1ecbt g\u00e0 ta th\u01a1m ngon k\u00e8m b\u00e1nh tr\u00e1ng m\u00e8."
    },
    {
        pattern: /goi cuon/i,
        name: "G\u1ecfi Cu\u1ed1n T\u00f4m Th\u1ecbt (3 cu\u1ed1n)",
        description: "T\u00f4m t\u01b0\u01a1i thanh ng\u1ecdt, th\u1ecbt lu\u1ed9c ch\u1ea5m t\u01b0\u01a1ng \u0111en xay th\u01a1m cay."
    },
    {
        pattern: /bo luc lac/i,
        name: "B\u00f2 L\u00fac L\u1eafc Khoai T\u00e2y",
        description: "Th\u1ecbt b\u00f2 M\u1ef9 x\u00e0o m\u1ec1m m\u1ecdng n\u01b0\u1edbc, \u0103n k\u00e8m khoai t\u00e2y chi\u00ean gi\u00f2n."
    },
    {
        pattern: /com chien/i,
        name: "C\u01a1m Chi\u00ean H\u1ea3i S\u1ea3n",
        description: "C\u01a1m \u0111\u1ea3o v\u00e0ng gi\u00f2n, t\u00f4m m\u1ef1c t\u01b0\u01a1i s\u1ed1t tr\u1ee9ng mu\u1ed1i th\u01a1m ngon."
    },
    {
        pattern: /ca phe sua/i,
        name: "C\u00e0 Ph\u00ea S\u1eefa \u0110\u00e1",
        description: "C\u00e0 ph\u00ea Robusta pha phin \u0111\u1eadm \u0111\u00e0 h\u00f2a quy\u1ec7n s\u1eefa \u0111\u1eb7c."
    },
    {
        pattern: /bac xiu/i,
        name: "B\u1ea1c X\u1ec9u \u0110\u00e1",
        description: "H\u01b0\u01a1ng v\u1ecb ng\u1ecdt ng\u00e0o b\u00e9o ng\u1eady d\u00e0nh cho t\u00edn \u0111\u1ed3 \u00edt c\u00e0 ph\u00ea."
    },
    {
        pattern: /tra tac/i,
        name: "Tr\u00e0 T\u1eafc M\u1eadt Ong",
        description: "V\u1ecb tr\u00e0 thanh m\u00e1t h\u00f2a quy\u1ec7n t\u1eafc t\u01b0\u01a1i v\u00e0 m\u1eadt ong r\u1eebng."
    },
    {
        pattern: /tra dao/i,
        name: "Tr\u00e0 \u0110\u00e0o Cam S\u1ea3",
        description: "V\u1ecb tr\u00e0 thanh m\u00e1t, cam t\u01b0\u01a1i m\u1ecdng n\u01b0\u1edbc k\u00e8m mi\u1ebfng \u0111\u00e0o gi\u00f2n."
    },
    {
        pattern: /tra sua/i,
        name: "Tr\u00e0 S\u1eefa Tr\u00e2n Ch\u00e2u \u0110\u01b0\u1eddng \u0110en",
        description: "Tr\u00e2n ch\u00e2u dai gi\u00f2n th\u01a1m m\u00f9i m\u00eda, s\u1eefa t\u01b0\u01a1i thanh tr\u00f9ng cao c\u1ea5p."
    },
    {
        pattern: /(cam|nuoc ep cam)/i,
        name: "N\u01b0\u1edbc \u00c9p Cam T\u01b0\u01a1i",
        description: "Cam s\u00e0nh v\u1eaft nguy\u00ean ch\u1ea5t, b\u1ed5 sung vitamin C d\u1ed3i d\u00e0o."
    },
    {
        pattern: /sinh to bo/i,
        name: "Sinh T\u1ed1 B\u01a1 \u0110\u1eb7c Bi\u1ec7t",
        description: "B\u01a1 s\u00e1p \u0110\u1eafk L\u1eafk \u0111\u1eb7c d\u1ebbo b\u00e9o ng\u1eady k\u00e8m s\u1eefa \u0111\u1eb7c th\u01a1m ngon."
    },
    {
        pattern: /matcha/i,
        name: "Matcha Latte \u0110\u00e1",
        description: "B\u1ed9t tr\u00e0 xanh Nh\u1eadt B\u1ea3n cao c\u1ea5p h\u00f2a c\u00f9ng s\u1eefa t\u01b0\u01a1i th\u01a1m m\u00e1t."
    },
    {
        pattern: /chanh tuyet/i,
        name: "Chanh Tuy\u1ebft Xay",
        description: "\u0110\u00e1 b\u00e0o tuy\u1ebft h\u00f2a quy\u1ec7n n\u01b0\u1edbc c\u1ed1t chanh chua ng\u1ecdt s\u1ea3ng kho\u00e1i."
    }
];

const updateVietnamese = async () => {
    try {
        await connectDB();
        console.log("Ket noi database thanh cong. Bat dau dong bo Tieng Viet co dau...");

        // 1. Cap nhat 10 ban an
        const tables = await Table.find();
        let tableUpdated = 0;
        for (const table of tables) {
            const num = table.code.replace(/^T0*/, "");
            const formattedNum = num.padStart(2, "0");
            const newName = `B\u00e0n ${formattedNum}`;
            if (table.name !== newName) {
                table.name = newName;
                await table.save();
                tableUpdated++;
            }
        }
        console.log(`Da dong bo tieng Viet cho ${tableUpdated} ban an.`);

        // 2. Cap nhat 16 mon an
        const items = await MenuItem.find();
        let itemsUpdated = 0;
        for (const item of items) {
            for (const v of VIETNAMESE_ITEMS) {
                if (v.pattern.test(item.name)) {
                    item.name = v.name;
                    item.description = v.description;
                    await item.save();
                    itemsUpdated++;
                    console.log(`- Da cap nhat: ${v.name}`);
                    break;
                }
            }
        }
        console.log(`Da dong bo tieng Viet cho ${itemsUpdated} mon an va do uong.`);
        console.log("Hoan tat dong bo Tieng Viet co dau vao Database!");
        process.exit(0);
    } catch (err) {
        console.error("Loi khi cap nhat Tieng Viet:", err.message);
        process.exit(1);
    }
};

updateVietnamese();

