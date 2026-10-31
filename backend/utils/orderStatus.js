// 1. Bang chuyen trang thai hop le
const ALLOWED_TRANSITIONS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [], // Da xong thi khong doi duoc nua
    cancelled: [] // Da huy thi khong doi duoc nua
};

// 2. Ten tieng Viet de hien thi thong bao
const STATUS_LABELS = {
    pending: "Cho xac nhan",
    confirmed: "Da xac nhan",
    completed: "Hoan thanh",
    cancelled: "Da huy"
};

// 3. Kiem tra 1 lan chuyen trang thai co hop le khong
const canTransition = (from, to) => {
    const nextList = ALLOWED_TRANSITIONS[from] || [];
    return nextList.includes(to);
};

module.exports = {
    ALLOWED_TRANSITIONS,
    STATUS_LABELS,
    canTransition
};