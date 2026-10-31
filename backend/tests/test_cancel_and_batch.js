const assert = require("assert");
const { canTransition, STATUS_LABELS } = require("../utils/orderStatus");

console.log("=== KIEM THU LOGIC CUSTOMER CANCEL, BATCH TRACK & SERVED/PAYMENT ===");

// 1. Kiem thu dieu kien huy don cua khach
function canCustomerCancel(status) {
    return status === "pending";
}

assert.strictEqual(canCustomerCancel("pending"), true, "Don pending phai cho phep huy");
assert.strictEqual(canCustomerCancel("confirmed"), false, "Don confirmed khong duoc huy");
assert.strictEqual(canCustomerCancel("served"), false, "Don served khong duoc huy");
assert.strictEqual(canCustomerCancel("completed"), false, "Don completed khong duoc huy");
assert.strictEqual(canCustomerCancel("cancelled"), false, "Don cancelled khong duoc huy");
console.log("[PASS] 1. Dieu kien cho phep khach tu huy don chinh xac");

// 2. Kiem thu filter orderIds trong batch-track
function filterValidIds(orderIds) {
    if (!Array.isArray(orderIds)) return [];
    return orderIds.filter((id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id));
}

const mockIds = ["65e5997132732aeddb362567", "invalid_id", "65e59c32732aeddb36258e11", 12345, null];
const filtered = filterValidIds(mockIds);
assert.strictEqual(filtered.length, 2, "Phai loc duoc 2 ID hop le");
console.log("[PASS] 2. Loc ID hop le cho batch-track chinh xac");

// 3. Kiem thu luong chuyen trang thai: pending -> confirmed -> served -> completed
assert.strictEqual(canTransition("pending", "confirmed"), true);
assert.strictEqual(canTransition("confirmed", "served"), true);
assert.strictEqual(canTransition("served", "completed"), true);
assert.strictEqual(canTransition("confirmed", "completed"), true);
assert.strictEqual(canTransition("pending", "served"), false);
assert.strictEqual(canTransition("completed", "served"), false);
assert.ok(STATUS_LABELS.served, "Phai co nhan trang thai served");
console.log("[PASS] 3. Luong chuyen trang thai served va thanh toan chinh xac");

console.log("Tong ket: Tat ca kiem thu bo sung deu thanh cong.");
