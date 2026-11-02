const assert = require("assert");
const { canTransition, STATUS_LABELS } = require("../utils/orderStatus");
const Table = require("../models/Table");

console.log("=== KIEM THU LOGIC CUSTOMER CANCEL, BATCH TRACK, TABLE OCCUPANCY & SINGLE ORDER ===");

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

// 4. Kiem thu Schema Table isOccupied (Co khach / Ban trong)
const sampleTable = new Table({ code: "T01", name: "Ban 01" });
assert.strictEqual(sampleTable.isOccupied, false, "Mac dinh ban moi phai la Ban trong (isOccupied = false)");
sampleTable.isOccupied = true;
assert.strictEqual(sampleTable.isOccupied, true, "Cap nhat ban Dang co khach (isOccupied = true)");
console.log("[PASS] 4. Model Table ho tro trang thai isOccupied (Co khach / Ban trong) chinh xac");

// 5. Kiem thu quy tac chan tao don moi khi con don chua thanh toan
function canCreateNewOrder(existingOrders) {
    const unpaid = existingOrders.find((o) => ["pending", "confirmed", "served"].includes(o.status));
    return !unpaid;
}

assert.strictEqual(canCreateNewOrder([]), true, "Chua co don thi duoc tao don moi");
assert.strictEqual(canCreateNewOrder([{ status: "completed" }]), true, "Don cu da thanh toan thi duoc tao don moi");
assert.strictEqual(canCreateNewOrder([{ status: "cancelled" }]), true, "Don cu da huy thi duoc tao don moi");
assert.strictEqual(canCreateNewOrder([{ status: "pending" }]), false, "Dang co don pending thi khong duoc tao don moi");
assert.strictEqual(canCreateNewOrder([{ status: "confirmed" }]), false, "Dang co don confirmed thi khong duoc tao don moi");
assert.strictEqual(canCreateNewOrder([{ status: "served" }]), false, "Dang co don served thi khong duoc tao don moi");
console.log("[PASS] 5. Quy tac 1 order / luot (phai thanh toan xong moi duoc tao don moi) chinh xac");

// 6. Kiem thu logic Doi ban (Change Table) chi cho phep chuyen sang ban dang trong va bat buoc co ly do
function canChangeOrderTable(orderStatus, targetTable, reason) {
    if (!["pending", "confirmed", "served"].includes(orderStatus)) return false;
    if (!targetTable || !targetTable.isActive || targetTable.isOccupied) return false;
    if (!reason || !String(reason).trim()) return false;
    return true;
}

assert.strictEqual(canChangeOrderTable("pending", { isActive: true, isOccupied: false }, "Ban cu bi nong"), true);
assert.strictEqual(canChangeOrderTable("confirmed", { isActive: true, isOccupied: false }, "Chuyen sang ban rong hon"), true);
assert.strictEqual(canChangeOrderTable("served", { isActive: true, isOccupied: false }, "Khach yeu cau doi vi tri"), true);
assert.strictEqual(canChangeOrderTable("pending", { isActive: true, isOccupied: false }, "   "), false, "Khong nhap ly do doi ban phai bi tu choi");
assert.strictEqual(canChangeOrderTable("completed", { isActive: true, isOccupied: false }, "Ly do"), false, "Don da thanh toan khong duoc doi ban");
assert.strictEqual(canChangeOrderTable("pending", { isActive: true, isOccupied: true }, "Ly do"), false, "Ban dich dang co khach khong duoc chuyen den");
assert.strictEqual(canChangeOrderTable("pending", { isActive: false, isOccupied: false }, "Ly do"), false, "Ban dich tam ngung khong duoc chuyen den");
console.log("[PASS] 6. Logic Doi ban (chi cho phep don dang phuc vu chuyen sang ban dang trong kem ly do) chinh xac");

// 7. Kiem thu Logic Phat Hien Bad Feedback (Danh gia toi ve nhan vien hoac nguyen lieu)
function evaluateFeedback(rating, issueCategory, comment) {
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) return { valid: false, error: "Rating 1-5" };
    const validCats = ["none", "staff", "ingredient", "both"];
    if (!validCats.includes(issueCategory)) return { valid: false, error: "Invalid category" };
    const isBad = numRating <= 2 || issueCategory !== "none";
    if (isBad && (!comment || !comment.trim())) return { valid: false, error: "Comment required for bad feedback" };
    return { valid: true, isBadFeedback: isBad };
}

assert.strictEqual(evaluateFeedback(5, "none", "").isBadFeedback, false, "5 sao va none khong phai bad feedback");
assert.strictEqual(evaluateFeedback(4, "none", "Ngon").isBadFeedback, false, "4 sao va none khong phai bad feedback");
assert.strictEqual(evaluateFeedback(2, "none", "Phuc vu cham").isBadFeedback, true, "2 sao phai la bad feedback");
assert.strictEqual(evaluateFeedback(1, "none", "Te").isBadFeedback, true, "1 sao phai la bad feedback");
assert.strictEqual(evaluateFeedback(4, "staff", "Nhan vien cau co").isBadFeedback, true, "Co loi nhan vien phai la bad feedback");
assert.strictEqual(evaluateFeedback(5, "ingredient", "Thit co mui la").isBadFeedback, true, "Co loi nguyen lieu phai la bad feedback");
assert.strictEqual(evaluateFeedback(3, "both", "Do an nguoi va nhan vien kho chiu").isBadFeedback, true, "Loi ca hai phai la bad feedback");
assert.strictEqual(evaluateFeedback(2, "none", "").valid, false, "Bad feedback khong co comment phai bi tu choi");
console.log("[PASS] 7. Logic Danh gia & Phat hien Bad Feedback ve nhan vien / nguyen lieu chinh xac");

// 8. Kiem thu Logic Void (Huy don mien thu) va Refund (Hoan tien toan bo hoac mot phan)
function validateVoidRefund(orderStatus, isAlreadyProcessed, actionType, incidentCategory, refundAmount, totalAmount) {
    if (isAlreadyProcessed) return { valid: false, error: "Already processed" };
    if (!["staff", "ingredient", "both"].includes(incidentCategory)) return { valid: false, error: "Invalid category" };

    if (["pending", "confirmed", "served"].includes(orderStatus)) {
        return { valid: true, effectiveAction: "void", effectiveRefund: totalAmount };
    }
    if (orderStatus === "completed") {
        if (actionType === "full_refund") {
            return { valid: true, effectiveAction: "full_refund", effectiveRefund: totalAmount };
        }
        if (actionType === "partial_refund") {
            const amt = Number(refundAmount);
            if (isNaN(amt) || amt <= 0 || amt > totalAmount) {
                return { valid: false, error: "Invalid refund amount" };
            }
            return { valid: true, effectiveAction: "partial_refund", effectiveRefund: amt };
        }
        return { valid: false, error: "Invalid action for completed" };
    }
    return { valid: false, error: "Cannot refund cancelled order" };
}

// Void cho don dang phuc vu
const voidRes = validateVoidRefund("served", false, "void", "staff", 0, 150000);
assert.strictEqual(voidRes.valid, true);
assert.strictEqual(voidRes.effectiveAction, "void");
assert.strictEqual(voidRes.effectiveRefund, 150000);

// Full refund cho don da thanh toan
const fullRefundRes = validateVoidRefund("completed", false, "full_refund", "ingredient", 0, 200000);
assert.strictEqual(fullRefundRes.valid, true);
assert.strictEqual(fullRefundRes.effectiveRefund, 200000);

// Partial refund hop le
const partialRes = validateVoidRefund("completed", false, "partial_refund", "both", 50000, 200000);
assert.strictEqual(partialRes.valid, true);
assert.strictEqual(partialRes.effectiveRefund, 50000);

// Partial refund vuot qua tong don
const invalidPartial = validateVoidRefund("completed", false, "partial_refund", "staff", 250000, 200000);
assert.strictEqual(invalidPartial.valid, false);

// Don da xu ly roi khong duoc xu ly lan 2
const alreadyDone = validateVoidRefund("completed", true, "full_refund", "staff", 0, 200000);
assert.strictEqual(alreadyDone.valid, false);
console.log("[PASS] 8. Logic Void / Refund hop le va kiem soat so tien hoan chinh xac");

console.log("Tong ket: Tat ca kiem thu bo sung deu thanh cong.");
