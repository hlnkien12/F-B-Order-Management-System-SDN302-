/**
 * Tu dien anh xa Tieng Viet co dau chuan cho He thong F&B Order
 * Tu dong hien thi Tieng Viet co dau tren toan bo UI du Database de khong dau
 */

const DICT = {
    // 1. Ten cac mon an (Food)
    "pho bo tai lan": "Ph\u1edf B\u00f2 T\u00e1i L\u0103n",
    "bun dau mam tom thap cam": "B\u00fan \u0110\u1eadu M\u1eafm T\u00f4m Th\u1eadp C\u1ea9m",
    "bun cha ha noi": "B\u00fan Ch\u1ea3 H\u00e0 N\u1ed9i",
    "com tam suon bi cha": "C\u01a1m T\u1ea5m S\u01b0\u1eddn B\u00ec Ch\u1ea3",
    "banh mi dac biet": "B\u00e1nh M\u00ec \u0110\u1eb7c Bi\u1ec7t",
    "mi quang ga ta": "M\u00ec Qu\u1ea3ng G\u00e0 Ta",
    "goi cuon tom thit (3 cuon)": "G\u1ecfi Cu\u1ed1n T\u00f4m Th\u1ecbt (3 cu\u1ed1n)",
    "goi cuon tom thit": "G\u1ecfi Cu\u1ed1n T\u00f4m Th\u1ecbt (3 cu\u1ed1n)",
    "bo luc lac khoai tay": "B\u00f2 L\u00fac L\u1eafc Khoai T\u00e2y",
    "com chien hai san": "C\u01a1m Chi\u00ean H\u1ea3i S\u1ea3n",

    // 2. Ten cac do uong (Drink)
    "ca phe sua da": "C\u00e0 Ph\u00ea S\u1eefa \u0110\u00e1",
    "bac xiu da": "B\u1ea1c X\u1ec9u \u0110\u00e1",
    "tra tac mat ong": "Tr\u00e0 T\u1eafc M\u1eadt Ong",
    "tra dao cam sa": "Tr\u00e0 \u0110\u00e0o Cam S\u1ea3",
    "tra sua tran chau duong den": "Tr\u00e0 S\u1eefa Tr\u00e2n Ch\u00e2u \u0110\u01b0\u1eddng \u0110en",
    "nuoc ep cam tuoi": "N\u01b0\u1edbc \u00c9p Cam T\u01b0\u01a1i",
    "sinh to bo dac biet": "Sinh T\u1ed1 B\u01a1 \u0110\u1eb7c Bi\u1ec7t",
    "matcha latte da": "Matcha Latte \u0110\u00e1",
    "chanh tuyet xay": "Chanh Tuy\u1ebft Xay",

    // 3. Mo ta chi tiet cac mon an va do uong
    "pho bo truyen thong nuoc dung ham xuong 12 tieng thom ngon.":
        "Ph\u1edf b\u00f2 truy\u1ec1n th\u1ed1ng n\u01b0\u1edbc d\u00f9ng h\u1ea7m x\u01b0\u01a1ng 12 ti\u1ebfng th\u01a1m ngon.",
    "dau mo ran gion, thit chan gio luoc, cha com, nem ran va doi sun.":
        "\u0110\u1eadu m\u01a1 r\u00e1n gi\u00f2n, th\u1ecbt ch\u00e2n gi\u00f2 lu\u1ed9c, ch\u1ea3 c\u1ed1m, nem r\u00e1n v\u00e0 d\u1ed3i s\u1ee5n.",
    "cha nuong than hoa thom lung, kem nem ran gion rum va rau song.":
        "Ch\u1ea3 n\u01b0\u1edbng than hoa th\u01a1m l\u1eebng, k\u00e8m nem r\u00e1n gi\u00f2n r\u1ee5m v\u00e0 rau s\u1ed1ng.",
    "suon nuong mat ong dam vi, cha trung hap thom bui.":
        "S\u01b0\u1eddn n\u01b0\u1edbng m\u1eadt ong \u0111\u1eadm v\u1ecb, ch\u1ea3 tr\u1ee9ng h\u1ea5p th\u01a1m b\u00f9i.",
    "banh mi pate cot den, thit nguoi, cha lua va sot bami dac trung.":
        "B\u00e1nh m\u00ec pate c\u1ed9t \u0111\u00e8n, th\u1ecbt ngu\u1ed9i, ch\u1ea3 l\u1ee5a v\u00e0 s\u1ed1t bami \u0111\u1eb7c tr\u01b0ng.",
    "mi quang soi vang ong, thit ga ta thom ngon kem banh trang me.":
        "M\u00ec Qu\u1ea3ng s\u1ee3i v\u00e0ng \u00f3ng, th\u1ecbt g\u00e0 ta th\u01a1m ngon k\u00e8m b\u00e1nh tr\u00e1ng m\u00e8.",
    "tom tuoi thanh ngot, thit luoc cham tuong den xay thom cay.":
        "T\u00f4m t\u01b0\u01a1i thanh ng\u1ecdt, th\u1ecbt lu\u1ed9c ch\u1ea5m t\u01b0\u01a1ng \u0111en xay th\u01a1m cay.",
    "thit bo my xao mem mong nuoc, an kem khoai tay chien gion.":
        "Th\u1ecbt b\u00f2 M\u1ef9 x\u00e0o m\u1ec1m m\u1ecdng n\u01b0\u1edbc, \u0103n k\u00e8m khoai t\u00e2y chi\u00ean gi\u00f2n.",
    "com dao vang gion, tom muc tuoi sot trung muoi thom ngon.":
        "C\u01a1m \u0111\u1ea3o v\u00e0ng gi\u00f2n, t\u00f4m m\u1ef1c t\u01b0\u01a1i s\u1ed1t tr\u1ee9ng mu\u1ed1i th\u01a1m ngon.",
    "ca phe robusta pha phin dam da hoa quyen sua dac.":
        "C\u00e0 ph\u00ea Robusta pha phin \u0111\u1eadm \u0111\u00e0 h\u00f2a quy\u1ec7n s\u1eefa \u0111\u1eb7c.",
    "ca phe robusta pha phin dam da hoa quyen sua dac nganh.":
        "C\u00e0 ph\u00ea Robusta pha phin \u0111\u1eadm \u0111\u00e0 h\u00f2a quy\u1ec7n s\u1eefa \u0111\u1eb7c.",
    "huong vi ngot ngao beo ngay danh cho tin do it ca phe.":
        "H\u01b0\u01a1ng v\u1ecb ng\u1ecdt ng\u00e0o b\u00e9o ng\u1eady d\u00e0nh cho t\u00edn \u0111\u1ed3 \u00edt c\u00e0 ph\u00ea.",
    "vi tra thanh mat, cam tuoi mong nuoc kem mieng dao gion.":
        "V\u1ecb tr\u00e0 thanh m\u00e1t, cam t\u01b0\u01a1i m\u1ecdng n\u01b0\u1edbc k\u00e8m mi\u1ebfng \u0111\u00e0o gi\u00f2n.",
    "vi tra thanh mat hoa quyen tac tuoi va mat ong rung.":
        "V\u1ecb tr\u00e0 thanh m\u00e1t h\u00f2a quy\u1ec7n t\u1eafc t\u01b0\u01a1i v\u00e0 m\u1eadt ong r\u1eebng.",
    "tran chau dai gion thom mui mia, sua tuoi thanh trung cao cap.":
        "Tr\u00e2n ch\u00e2u dai gi\u00f2n th\u01a1m m\u00f9i m\u00eda, s\u1eefa t\u01b0\u01a1i thanh tr\u00f9ng cao c\u1ea5p.",
    "cam sanh vat nguyen chat, bo sung vitamin c doi dao.":
        "Cam s\u00e0nh v\u1eaft nguy\u00ean ch\u1ea5t, b\u1ed5 sung vitamin C d\u1ed3i d\u00e0o.",
    "bo sap dak lak dac deo beo ngay kem sua dac thom ngon.":
        "B\u01a1 s\u00e1p \u0110\u1eafk L\u1eafk \u0111\u1eb7c d\u1ebbo b\u00e9o ng\u1eady k\u00e8m s\u1eefa \u0111\u1eb7c th\u01a1m ngon.",
    "bot tra xanh nhat ban cao cap hoa cung sua tuoi thom mat.":
        "B\u1ed9t tr\u00e0 xanh Nh\u1eadt B\u1ea3n cao c\u1ea5p h\u00f2a c\u00f9ng s\u1eefa t\u01b0\u01a1i th\u01a1m m\u00e1t.",
    "da bao tuyet hoa quyen nuoc cot chanh chua ngot sang khoai.":
        "\u0110\u00e1 b\u00e0o tuy\u1ebft h\u00f2a quy\u1ec7n n\u01b0\u1edbc c\u1ed1t chanh chua ng\u1ecdt s\u1ea3ng kho\u00e1i.",
    "mon ngon chuan vi quan.": "M\u00f3n ngon chu\u1ea9n v\u1ecb qu\u00e1n.",

    // 4. Phan loai
    "food": "M\u00f3n \u0103n",
    "drink": "\u0110\u1ed3 u\u1ed1ng"
};

/**
 * Kiem tra chuoi co dau tieng Viet hay chua
 */
const hasVietnameseAccent = (str) => {
    return /[\u00e0\u00e1\u1ea1\u1ea3\u00e3\u00e2\u1ea7\u1ea5\u1ead\u1ea9\u1eab\u0103\u1eb1\u1eaf\u1eb7\u1eb3\u1eb5\u00e8\u00e9\u1eb9\u1ebb\u1ebd\u00ea\u1ec1\u1ebf\u1ec7\u1ec3\u1ec5\u00ec\u00ed\u1ecb\u1ec9\u0129\u00f2\u00f3\u1ecd\u1ecf\u00f5\u00f4\u1ed3\u1ed1\u1ed9\u1ed5\u1ed7\u01a1\u1edd\u1edb\u1ee3\u1edf\u1ee1\u00f9\u00fa\u1ee5\u1ee7\u0169\u01b0\u1eeb\u1ee9\u1ef1\u1eed\u1eef\u1ef3\u00fd\u1ef5\u1ef7\u1ef9\u0111]/i.test(str);
};

/**
 * Chuyen doi chuoi khong dau sang co dau tieng Viet chuan
 */
export const toVietnamese = (text) => {
    if (!text || typeof text !== "string") return text;
    const trimmed = text.trim();
    if (!trimmed) return text;

    // Neu chuoi da co dau tieng Viet san thi giu nguyen
    if (hasVietnameseAccent(trimmed)) return trimmed;

    // Kiem tra tra cuu trong tu dien
    const key = trimmed.toLowerCase();
    if (DICT[key]) return DICT[key];

    // Chuan hoa ten ban: "Ban 01" -> "Ban 01"
    const tableMatch = trimmed.match(/^ban\s*(\w+)$/i);
    if (tableMatch) {
        return "B\u00e0n " + tableMatch[1];
    }

    return trimmed;
};

/**
 * Loai bo toan bo dau Tieng Viet phuc vu tim kiem linh hoat
 */
export const removeVietnameseTones = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u0111/g, "d")
        .replace(/\u0110/g, "D")
        .toLowerCase()
        .trim();
};

/**
 * So khop tim kiem Tieng Viet 2 chieu (co dau hoac khong dau)
 */
export const matchVietnameseSearch = (sourceText, queryText) => {
    if (!queryText || !queryText.trim()) return true;
    if (!sourceText) return false;

    const cleanQuery = removeVietnameseTones(queryText);
    const cleanSource = removeVietnameseTones(sourceText);

    return cleanSource.includes(cleanQuery);
};

export default {
    toVietnamese,
    removeVietnameseTones,
    matchVietnameseSearch
};

