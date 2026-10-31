const MenuItem = require("../models/MenuItem");

console.log("=== KIEM THU LOGIC OPTIONS & VARIANTS ===");
let passed = 0;
let failed = 0;

const assert = (cond, name) => {
    if (cond) {
        console.log(`[PASS] ${name}`);
        passed++;
    } else {
        console.error(`[FAIL] ${name}`);
        failed++;
    }
};

// Test 1: Food default options
const foodOpts = MenuItem.getDefaultOptions("food");
assert(Array.isArray(foodOpts) && foodOpts.length === 2, "1. Food options co 2 muc");
assert(foodOpts[0].label === "Thường" && foodOpts[0].priceDelta === 0, "2. Food option 1 la Thuong (+0d)");
assert(foodOpts[1].label === "Đặc biệt" && foodOpts[1].priceDelta === 15000, "3. Food option 2 la Dac biet (+15000d)");

// Test 2: Drink default options
const drinkOpts = MenuItem.getDefaultOptions("drink");
assert(Array.isArray(drinkOpts) && drinkOpts.length === 3, "4. Drink options co 3 muc");
assert(drinkOpts[0].label === "Size M" && drinkOpts[0].priceDelta === 0, "5. Drink Size M (+0d)");
assert(drinkOpts[1].label === "Size L" && drinkOpts[1].priceDelta === 5000, "6. Drink Size L (+5000d)");
assert(drinkOpts[2].label === "Size XL" && drinkOpts[2].priceDelta === 10000, "7. Drink Size XL (+10000d)");

// Test 3: getEffectiveOptions
const itemWithoutOptions = { name: "Bạc Xỉu Đá", type: "drink", price: 28000 };
const effOpts = MenuItem.getEffectiveOptions(itemWithoutOptions);
assert(effOpts.length === 3 && effOpts[1].label === "Size L", "8. Item chua co options tu dong suy dien dung Size L");

const customItem = {
    name: "Lẩu Hải Sản",
    type: "food",
    price: 150000,
    options: [
        { label: "Nồi Nhỏ", priceDelta: 0 },
        { label: "Nồi Lớn", priceDelta: 50000 }
    ]
};
const customEffOpts = MenuItem.getEffectiveOptions(customItem);
assert(customEffOpts.length === 2 && customEffOpts[1].label === "Nồi Lớn" && customEffOpts[1].priceDelta === 50000, "9. Item co options custom giu nguyen tuy chon");

console.log(`Tong ket: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);

