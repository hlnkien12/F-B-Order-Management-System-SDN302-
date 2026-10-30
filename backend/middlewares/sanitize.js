/**
 * De quy loc bo cac key chua ky tu $ hoac . trong object
 */
const cleanData = (data) => {
    if (!data || typeof data !== "object") return data;

    if (Array.isArray(data)) {
        return data.map((item) => cleanData(item));
    }

    const cleaned = {};
    for (const key of Object.keys(data)) {
        if (key.startsWith("$") || key.includes(".")) {
            continue; // Loai bo key doc hai
        }
        cleaned[key] = cleanData(data[key]);
    }
    return cleaned;
};

const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = cleanData(req.body);
    }
    next();
};

module.exports = sanitizeInput;