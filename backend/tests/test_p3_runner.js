const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");
const { initSocket } = require("../socket");

const runTests = async () => {
  console.log("=== BAT DAU KIEM THU TU DONG GIAI DOAN P3 ===");

  await connectDB();
  const server = http.createServer(app);
  initSocket(server);

  // Mo server tren cong dong (port 0) de khong bao gio bi trung port
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://127.0.0.1:${port}`;
  console.log(`Server test dang chay tai port: ${port}`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, extraInfo = "") => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${extraInfo}`);
      failed++;
    }
  };

  try {
    // 1. Dang nhap Staff
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "staff@shop.com", password: "staff123" })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.data?.accessToken, "1. Staff Login thanh cong");
    const staffToken = loginData.data?.accessToken;

    // 2. Lay thuc don de lay 2 mon dau tien
    const menuRes = await fetch(`${BASE_URL}/api/menu-items`);
    const menuData = await menuRes.json();
    assert(menuRes.status === 200 && menuData.data?.length >= 2, "2. Menu List co du mon de test");
    const item1 = menuData.data[0];
    const item2 = menuData.data[1];

    // 3. Khach vang lai dat hang hop le (co gui trung mon 1: 2 + 1 = 3)
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableCode: "T01",
        customerName: "Tran Thi Khach",
        customerPhone: "0987654321",
        note: "It cay",
        items: [
          { menuItemId: item1._id, quantity: 2 },
          { menuItemId: item2._id, quantity: 1 },
          { menuItemId: item1._id, quantity: 1 } // gui trung de test gop
        ]
      })
    });
    const orderData = await orderRes.json();
    assert(orderRes.status === 201, "3.1. Tao don hang khach vang lai status 201");

    const createdOrder = orderData.data;
    assert(createdOrder?.orderCode?.includes("-"), "3.2. Sinh ma don hang hop le dang YYYYMMDD-xxx");
    assert(createdOrder?.tableName === "Ban 01", "3.3. Gan dung ten ban");

    // Kiem tra tu dong gop mon trung: item1 phai co quantity = 3
    const mergedItem1 = createdOrder?.items?.find((i) => String(i.menuItemId) === String(item1._id));
    assert(mergedItem1?.quantity === 3, "3.4. Tu dong gop mon trung lap (2 + 1 = 3)");

    // Kiem tra server tu tinh tong tien
    const expectedTotal = item1.price * 3 + item2.price * 1;
    assert(createdOrder?.totalAmount === expectedTotal, `3.5. Server tu tinh dung tong tien: ${createdOrder?.totalAmount} === ${expectedTotal}`);

    const orderId = createdOrder?._id;

    // 4. Test loi: Dat ban khong ton tai (T99)
    const badTableRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableCode: "T99",
        customerName: "Khach",
        customerPhone: "0987654321",
        items: [{ menuItemId: item1._id, quantity: 1 }]
      })
    });
    assert(badTableRes.status === 400, "4. Chặn bàn không tồn tại (Status 400)");

    // 5. Test loi: So dien thoai sai dinh dang
    const badPhoneRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableCode: "T01",
        customerName: "Khach",
        customerPhone: "12345",
        items: [{ menuItemId: item1._id, quantity: 1 }]
      })
    });
    assert(badPhoneRes.status === 400, "5. Chặn số điện thoại sai định dạng (Status 400)");

    // 6. Theo doi don hang (Public) - Bao mat khong tra SĐT
    const trackRes = await fetch(`${BASE_URL}/api/orders/${orderId}/track`);
    const trackData = await trackRes.json();
    assert(trackRes.status === 200, "6.1. Khách theo dõi đơn hàng (Status 200)");
    assert(trackData.data?.customerPhone === undefined, "6.2. Bảo mật: Không để lộ SĐT khách khi theo dõi đơn");

    // 7. Nhan vien lay danh sach don hang
    const listRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const listData = await listRes.json();
    assert(listRes.status === 200 && listData.total >= 1, "7. Nhân viên lấy danh sách đơn (Status 200)");

    // 8. Chặn khi không có token
    const noTokenRes = await fetch(`${BASE_URL}/api/orders`);
    assert(noTokenRes.status === 401, "8. Chặn xem danh sách đơn khi không có token (Status 401)");

    // 9. Nhan vien xac nhan don: pending -> confirmed
    const confirmRes = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: "confirmed" })
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 200 && confirmData.data?.status === "confirmed", "9. Chuyển trạng thái: pending -> confirmed");

    // 10. Nhan vien hoan thanh don: confirmed -> completed
    const completeRes = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: "completed" })
    });
    const completeData = await completeRes.json();
    assert(completeRes.status === 200 && completeData.data?.status === "completed", "10. Chuyển trạng thái: confirmed -> completed");

    // 11. Chặn chuyển trạng thái sai: completed -> cancelled (da xong thi cam huy)
    const illegalCancelRes = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: "cancelled", cancelReason: "Huy thu" })
    });
    assert(illegalCancelRes.status === 400, "11. Chặn huỷ đơn khi đã hoàn thành (Status 400)");

    // 12. Khach hang co tai khoan dat mon (tu dong lay ten va SDT tu user)
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "khach1@gmail.com", password: "password123" })
    });
    const userLoginData = await userLoginRes.json();
    const userToken = userLoginData.data?.accessToken;

    const userOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        tableCode: "T02",
        items: [{ menuItemId: item2._id, quantity: 2 }]
        // Khong truyen customerName va customerPhone de test server tu dien
      })
    });
    const userOrderData = await userOrderRes.json();
    assert(userOrderRes.status === 201, "12.1. Khách có tài khoản đặt món thành công (Status 201)");
    assert(userOrderData.data?.customerName === "Nguyen Van Khach", "12.2. Tự động lấy họ tên từ tài khoản user");
    assert(userOrderData.data?.customerPhone === "0912345678", "12.3. Tự động lấy SĐT từ tài khoản user");

    // 13. Khach xem lich su don cua minh (/api/orders/my)
    const myOrdersRes = await fetch(`${BASE_URL}/api/orders/my`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const myOrdersData = await myOrdersRes.json();
    assert(myOrdersRes.status === 200 && myOrdersData.total >= 1, "13. Khách xem lịch sử đơn hàng của mình (Status 200)");

  } catch (err) {
    console.error("Loi trong qua trinh test:", err);
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log(`\n=== KET QUA: ${passed} PASS, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();

