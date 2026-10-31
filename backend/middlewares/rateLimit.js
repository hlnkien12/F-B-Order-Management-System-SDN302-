/**
 * Tao middleware gioi han so request theo IP
 * @param {number} maxRequests - So request toi da trong 1 khung thoi gian
 * @param {number} windowMs - Do dai khung thoi gian (mili giay)
 */
const createRateLimiter = (maxRequests, windowMs) => {
    // Luu lich su request: { "ip": [thoi_diem_1, thoi_diem_2, ...] }
    const history = new Map();

    return (req, res, next) => {
        const ip = req.ip || "unknown";
        const now = Date.now();

        // 1. Chi giu lai cac request nam trong khung thoi gian gan nhat
        const recent = (history.get(ip) || []).filter((time) => now - time < windowMs);

        // 2. Vuot gioi han thi chan lai
        if (recent.length >= maxRequests) {
            const waitSeconds = Math.ceil((windowMs - (now - recent[0])) / 1000);
            return res.status(429).json({
                error: `Ban gui qua nhieu yeu cau! Vui long thu lai sau ${waitSeconds} giay.`
            });
        }

        // 3. Ghi nhan request hien tai va cho di tiep
        recent.push(now);
        history.set(ip, recent);
        next();
    };
};

// Gioi han tao don: toi da 5 don / 1 phut / 1 IP
const orderRateLimiter = createRateLimiter(5, 60 * 1000);

module.exports = {
    createRateLimiter,
    orderRateLimiter
};