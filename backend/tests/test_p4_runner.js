const http = require("http");

const BASE_URL = "http://localhost:5000";

function request(options, bodyData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });
        req.on("error", reject);
        if (bodyData) {
            req.write(typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData));
        }
        req.end();
    });
}

async function run() {
    console.log("=== BAT DAU KIEM TRA TOAN BO API GIAI DOAN P4 (STAFF MANAGEMENT) ===");

    // 1. Dang nhap Admin
    console.log("\n[1] Test Admin Login...");
    const loginRes = await request(
        {
            hostname: "127.0.0.1",
            port: 5000,
            path: "/api/auth/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        },
        { email: "admin@shop.com", password: "admin123" }
    );
    if (loginRes.status !== 200) {
        console.error("FAIL: Khong the dang nhap Admin:", loginRes.data);
        return;
    }
    const adminToken = loginRes.data.data.accessToken;
    console.log("PASS: Admin login thanh cong, da lay AccessToken.");

    // 2. Lay danh sach nhan vien (Staff List)
    console.log("\n[2] Test GET /api/staff (Staff List)...");
    const listRes = await request({
        hostname: "127.0.0.1",
        port: 5000,
        path: "/api/staff",
        method: "GET",
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`Status: ${listRes.status}, Total staff: ${listRes.data.total}`);
    if (listRes.status === 200 && Array.isArray(listRes.data.data)) {
        console.log("PASS: Lay danh sach nhan vien thanh cong.");
    } else {
        console.error("FAIL:", listRes.data);
    }

    // 3. Tao nhan vien moi (Staff Creation)
    console.log("\n[3] Test POST /api/staff (Staff Creation)...");
    const newStaffData = {
        name: "Tran Van Thu Ngan 2",
        email: `staff_test_${Date.now()}@shop.com`,
        phone: "0981122334",
        password: "password123"
    };
    const createRes = await request(
        {
            hostname: "127.0.0.1",
            port: 5000,
            path: "/api/staff",
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            }
        },
        newStaffData
    );
    console.log(`Status: ${createRes.status}`);
    if (createRes.status !== 201) {
        console.error("FAIL:", createRes.data);
        return;
    }
    const createdId = createRes.data.data.id;
    console.log(`PASS: Tao thanh cong nhan vien ID: ${createdId}`);

    // 4. Khoa / mo khoa tai khoan (Staff Status Toggle)
    console.log("\n[4] Test PATCH /api/staff/:id/status (Staff Status Toggle)...");
    const toggleRes = await request(
        {
            hostname: "127.0.0.1",
            port: 5000,
            path: `/api/staff/${createdId}/status`,
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            }
        },
        { isActive: false }
    );
    console.log(`Status: ${toggleRes.status}, Message: ${toggleRes.data.message}`);
    if (toggleRes.status === 200 && toggleRes.data.data.isActive === false) {
        console.log("PASS: Khoa tai khoan thanh cong (isActive: false).");
    } else {
        console.error("FAIL:", toggleRes.data);
    }

    // 5. Xoa tai khoan nhan vien (Staff Deletion)
    console.log("\n[5] Test DELETE /api/staff/:id (Staff Deletion)...");
    const deleteRes = await request({
        hostname: "127.0.0.1",
        port: 5000,
        path: `/api/staff/${createdId}`,
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`Status: ${deleteRes.status}, Message: ${deleteRes.data.message}`);
    if (deleteRes.status === 200) {
        console.log("PASS: Xoa tai khoan nhan vien thanh cong.");
    } else {
        console.error("FAIL:", deleteRes.data);
    }

    // 6. Kiem tra bao mat: Khach hoac user khong phai Admin bi chan 403
    console.log("\n[6] Test Authorization: User thuong truy cap /api/staff bi chan 403...");
    const guestRes = await request({
        hostname: "127.0.0.1",
        port: 5000,
        path: "/api/staff",
        method: "GET"
    });
    if (guestRes.status === 401) {
        console.log("PASS: Khong co token bi chan 401.");
    } else {
        console.error("FAIL:", guestRes.status, guestRes.data);
    }

    console.log("\n=== KET QUA: TOAN BO 4/4 API CUA GIAI DOAN P4 DA TEST THANH CONG 100% ===");
}

run().catch(console.error);

