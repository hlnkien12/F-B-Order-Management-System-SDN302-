# HỆ THỐNG QUẢN LÝ ORDER ĐỒ ĂN, ĐỒ UỐNG TẠI BÀN (SDN302)

Ứng dụng web Full-stack hỗ trợ số hóa quy trình gọi món tại chỗ (Dine-in) qua mã QR cho cửa hàng F&B. Hệ thống cho phép khách hàng chủ động chọn món, tùy chỉnh kích cỡ/định lượng, theo dõi tiến độ chế biến và gọi thanh toán theo thời gian thực; đồng thời cung cấp màn hình điều phối đơn hàng chuẩn KDS/POS cho bộ phận Bếp, Thu ngân và Quản trị viên.

---

## MỤC LỤC
1. [Kiến Trúc Hệ Thống & Công Nghệ Sử Dụng](#1-kiến-trúc-hệ-thống--công-nghệ-sử-dụng)
2. [Cấu Trúc Thư Mục Dự Án](#2-cấu-trúc-thư-mục-dự-án)
3. [Hướng Dẫn Cài Đặt & Khởi Chạy Hệ Thống](#3-hướng-dẫn-cài-đặt--khởi-chạy-hệ-thống)
4. [Danh Sách Tài Khoản Demo & Dữ Liệu Mẫu](#4-danh-sách-tài-khoản-demo--dữ-liệu-mẫu)
5. [Tài Liệu API Chi Tiết Theo Thư Mục](#5-tài-liệu-api-chi-tiết-theo-thư-mục)
6. [Cơ Chế Realtime Socket.IO](#6-cơ-chế-realtime-socketio)
7. [Kịch Bản Demo Báo Cáo Bảo Vệ Dự Án](#7-kịch-bản-demo-báo-cáo-bảo-vệ-dự-án)
8. [Kiểm Thử Tự Động (Unit & Integration Tests)](#8-kiểm-thử-tự-động-unit--integration-tests)

---

## 1. Kiến Trúc Hệ Thống & Công Nghệ Sử Dụng

### 1.1. Kiến trúc tổng thể
- **Mô hình Client - Server tách biệt:**
  - **Frontend (`http://localhost:5173`):** Ứng dụng Single Page Application (SPA) xây dựng bằng React + Vite, kết nối tới Backend qua RESTful API (Axios có tích hợp Interceptor tự động làm mới Access Token) và nhận sự kiện thời gian thực qua Socket.IO Client.
  - **Backend (`http://localhost:5000`):** Xây dựng trên nền tảng Node.js và Express theo mô hình MVC (Models - Controllers - Routes - Middlewares), kết hợp máy chủ WebSocket (Socket.IO) để đồng bộ trạng thái đơn hàng tức thì giữa bàn khách và quầy bếp/thu ngân.
  - **Cơ sở dữ liệu (MongoDB):** Lưu trữ dữ liệu phi quan hệ (NoSQL) thông qua thư viện ODM Mongoose với các ràng buộc dữ liệu (Schema Validation) chặt chẽ.

### 1.2. Công nghệ chi tiết
| Phân hệ | Công nghệ / Thư viện | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express 5 | Xây dựng RESTful API Server và định tuyến phân quyền. |
| | MongoDB, Mongoose 9 | Quản lý Schema dữ liệu: `User`, `MenuItem`, `Table`, `Order`, `Counter`. |
| | Socket.IO | Truyền tải thông báo đơn hàng mới, cập nhật tiến độ món và gọi thanh toán theo thời gian thực. |
| | JSON Web Token (JWT) | Cơ chế xác thực kép: `Access Token` (ngắn hạn, gửi qua Header) và `Refresh Token` (lưu trong `httpOnly Cookie`). |
| | BcryptJS | Mã hóa mật khẩu người dùng một chiều an toàn. |
| **Frontend** | React 18, Vite | Xây dựng giao diện người dùng tốc độ cao, phản hồi tức thì. |
| | React-Bootstrap, Bootstrap 5 | Thiết kế giao diện Responsive tương thích trên cả điện thoại di động, máy tính bảng tại bàn và màn hình POS thu ngân. |
| | React Router DOM v6 | Điều hướng trang phía Client và bảo vệ các đường dẫn quản trị (`/admin/*`). |
| | Axios | Giao tiếp HTTP API, tự động đính kèm Bearer Token và tự động gọi `/api/auth/refresh` khi hết hạn phiên. |
| | QRCode.react | Sinh mã QR trực tiếp cho từng bàn ăn để in ấn hoặc quét thử nghiệm. |

---

## 2. Cấu Trúc Thư Mục Dự Án

```text
F-B-Order-Management-System-SDN302-/
├── backend/                              # Máy chủ API & Socket.IO (Port 5000)
│   ├── config/
│   │   └── db.js                         # Cấu hình kết nối MongoDB
│   ├── controllers/                      # Xử lý nghiệp vụ chính của từng phân hệ
│   │   ├── authController.js             # Nghiệp vụ đăng ký, đăng nhập, làm mới token, đăng xuất
│   │   ├── menuController.js             # Nghiệp vụ CRUD món ăn, đồ uống và tùy chọn size/định lượng
│   │   ├── orderController.js            # Nghiệp vụ tạo đơn, hủy đơn, gọi thanh toán, điều phối trạng thái đơn
│   │   ├── staffController.js            # Nghiệp vụ quản lý tài khoản nhân viên dành cho Admin
│   │   └── tableController.js            # Nghiệp vụ quản lý bàn ăn và tra cứu mã bàn QR
│   ├── middlewares/                      # Các lớp trung gian bảo vệ và kiểm tra dữ liệu
│   │   ├── auth.js                       # Xác thực JWT (verifyToken, optionalAuth) và phân quyền (requireRole)
│   │   ├── errorHandler.js               # Bắt và chuẩn hóa thông báo lỗi tập trung
│   │   ├── rateLimit.js                  # Chống spam gửi đơn hàng liên tục (Rate Limiter)
│   │   ├── sanitize.js                   # Làm sạch dữ liệu đầu vào, chống NoSQL Injection & XSS
│   │   └── validate.js                   # Kiểm tra định dạng email, số điện thoại, mật khẩu
│   ├── models/                           # Định nghĩa cấu trúc bảng dữ liệu (Mongoose Schemas)
│   │   ├── Counter.js                    # Bộ đếm tự tăng sinh mã đơn hàng theo ngày (YYYYMMDD-XXX)
│   │   ├── MenuItem.js                   # Schema món ăn/đồ uống kèm mảng tùy chọn (options: label, priceDelta)
│   │   ├── Order.js                      # Schema đơn hàng, chi tiết món, trạng thái và yêu cầu thanh toán
│   │   ├── Table.js                      # Schema bàn ăn (code, name, isActive)
│   │   └── User.js                       # Schema người dùng (role: customer, staff, admin)
│   ├── routes/                           # Khai báo các điểm cuối API (API Endpoints)
│   │   ├── authRoutes.js                 # Định tuyến nhóm API /api/auth
│   │   ├── menuRoutes.js                 # Định tuyến nhóm API /api/menu-items
│   │   ├── orderRoutes.js                # Định tuyến nhóm API /api/orders
│   │   ├── staffRoutes.js                # Định tuyến nhóm API /api/staff
│   │   └── tableRoutes.js                # Định tuyến nhóm API /api/tables
│   ├── socket/
│   │   └── index.js                      # Quản lý kết nối Socket.IO và các phòng (staff-room, order:<id>)
│   ├── utils/
│   │   └── orderStatus.js                # Máy trạng thái (State Machine) kiểm soát luồng chuyển trạng thái đơn
│   ├── tests/                            # Các kịch bản kiểm thử tự động (Unit & Integration Tests)
│   ├── app.js                            # Cấu hình Express App, CORS, CookieParser và gắn Routes
│   ├── server.js                         # Điểm khởi chạy HTTP Server tích hợp Socket.IO
│   ├── seed.js                           # Script khởi tạo dữ liệu mẫu (Admin, Staff, 10 Bàn, 16 Món)
│   └── update_vietnamese.js              # Script đồng bộ tên món tiếng Việt có dấu và tùy chọn Size chuẩn
│
├── frontend/                             # Giao diện người dùng React SPA (Port 5173)
│   ├── public/images/                    # Hình ảnh món ăn tĩnh phục vụ hiển thị nhanh
│   └── src/
│       ├── api/
│       │   └── axiosClient.js            # Cấu hình Axios kèm cơ chế tự động Refresh Token
│       ├── components/
│       │   ├── AdminLayout.jsx           # Khung giao diện và thanh điều hướng nội bộ cho Admin/Staff
│       │   ├── AppNavbar.jsx             # Thanh điều hướng chính (tự động tách biệt chế độ Khách và Quản trị)
│       │   └── customer/
│       │       └── OrderedItemsTab.jsx   # Component quản lý các đơn đã gọi của bàn, thanh tiến độ và gọi thanh toán
│       ├── context/
│       │   ├── AuthContext.jsx           # Quản lý trạng thái đăng nhập toàn cục
│       │   └── CartContext.jsx           # Quản lý giỏ hàng theo tùy chọn món, đồng bộ đơn của bàn qua Socket.IO
│       ├── pages/
│       │   ├── auth/                     # Trang Đăng nhập (LoginPage) và Đăng ký (RegisterPage)
│       │   ├── customer/                 # Trang Thực đơn (MenuPage), Giỏ hàng & Đơn bàn (CartPage), Theo dõi đơn (OrderTrackingPage)
│       │   └── admin/                    # Trang Quản lý đơn KDS/POS (OrdersBoardPage), Thực đơn (MenuManagePage), Bàn QR (TablesPage), Nhân viên (StaffManagePage)
│       ├── socket/
│       │   └── socket.js                 # Khởi tạo kết nối Socket.IO phía Client
│       └── utils/
│           └── vietnameseDictionary.js   # Bộ từ điển chuẩn hóa hiển thị tiếng Việt có dấu và tìm kiếm không dấu
│
├── OrderRequirement.md                   # Tài liệu đặc tả yêu cầu gốc của đề tài
└── README.md                             # Tài liệu hướng dẫn toàn diện của dự án
```

---

## 3. Hướng Dẫn Cài Đặt & Khởi Chạy Hệ Thống

### 3.1. Yêu cầu môi trường
- **Node.js:** Phiên bản `v18.x` trở lên.
- **MongoDB:** Đang chạy dịch vụ MongoDB cục bộ (`mongodb://127.0.0.1:27017`) hoặc có chuỗi kết nối MongoDB Atlas.

### 3.2. Thiết lập và khởi chạy Backend
Mở Terminal thứ nhất, di chuyển vào thư mục `backend`:

```bash
cd backend
npm install
```

Kiểm tra hoặc tạo file `.env` trong thư mục `backend/` (có thể sao chép từ `.env.example`) với nội dung:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/fb_order_system
JWT_ACCESS_SECRET=your_super_secret_access_key_sdn302
JWT_REFRESH_SECRET=your_super_secret_refresh_key_sdn302
CLIENT_URL=http://localhost:5173
```

Khởi tạo dữ liệu mẫu (Tài khoản Admin/Staff, 10 bàn ăn `T01` - `T10`, 16 món ăn & đồ uống kèm tùy chọn kích cỡ):

```bash
npm run seed
node update_vietnamese.js
```

Khởi chạy máy chủ Backend:

```bash
npm run dev
```
*(Backend sẽ hoạt động tại địa chỉ `http://localhost:5000`)*

### 3.3. Thiết lập và khởi chạy Frontend
Mở Terminal thứ hai, di chuyển vào thư mục `frontend`:

```bash
cd frontend
npm install
npm run dev
```
*(Frontend sẽ hoạt động tại địa chỉ `http://localhost:5173`)*

---

## 4. Danh Sách Tài Khoản Demo & Dữ Liệu Mẫu

Sau khi chạy lệnh `npm run seed`, hệ thống đã tạo sẵn các tài khoản và dữ liệu sau để phục vụ kiểm thử và báo cáo:

### 4.1. Tài khoản hệ thống
| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn trong hệ thống |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@shop.com` | `admin123` | Toàn quyền: Điều phối đơn hàng KDS/POS, CRUD Thực đơn, CRUD Bàn ăn & Mã QR, Quản lý tài khoản nhân viên. |
| **Nhân viên (Staff)** | `staff@shop.com` | `staff123` | Nghiệp vụ vận hành: Tiếp nhận & xử lý đơn hàng trên màn hình KDS/POS, chốt thanh toán bàn, bật/tắt trạng thái Còn món / Hết món. |
| **Khách hàng (Customer)** | *(Tự đăng ký mới hoặc dùng chế độ Khách vãng lai)* | *(Tùy chọn)* | Quét QR chọn bàn, chọn món + size, gửi đơn, theo dõi tiến độ món, tự hủy đơn khi chờ duyệt, gọi thanh toán tại bàn. |

### 4.2. Danh sách bàn ăn mẫu
- Hệ thống khởi tạo sẵn **10 bàn ăn** có mã từ `T01` (Bàn 01) đến `T10` (Bàn 10).
- Đường dẫn giả lập quét mã QR trực tiếp tại Bàn 01: `http://localhost:5173/?table=T01`

---

## 5. Tài Liệu API Chi Tiết Theo Thư Mục

Toàn bộ các điểm cuối API được khai báo trong thư mục `backend/routes/` và ánh xạ trực tiếp tới các hàm xử lý nghiệp vụ trong `backend/controllers/`. Tất cả API đều được gắn tiền tố gốc tại file `backend/app.js`.

---

### 5.1. Kiểm tra trạng thái máy chủ (`backend/app.js`)
| Phương thức | Đường dẫn (Endpoint) | Quyền truy cập | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Công khai (Public) | Kiểm tra máy chủ Backend đang hoạt động ổn định và lấy thời gian phản hồi hiện tại của server. |

---

### 5.2. Phân hệ Xác thực & Phiên làm việc
- **File định tuyến:** `backend/routes/authRoutes.js` (Tiền tố gốc: `/api/auth`)
- **File xử lý nghiệp vụ:** `backend/controllers/authController.js`
- **File kiểm thử REST Client:** `backend/test_auth.http`

| Phương thức | Đường dẫn (Endpoint) | Quyền truy cập | Dữ liệu đầu vào (Body / Cookie) | Mục đích chi tiết của API |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Công khai | Body: `{ name, email, phone, password }` | Đăng ký tài khoản mới cho khách hàng. Tự động làm sạch dữ liệu đầu vào, kiểm tra trùng lặp email, mã hóa mật khẩu bằng Bcrypt và cấp ngay `accessToken` kèm `refreshToken` trong `httpOnly Cookie`. |
| `POST` | `/api/auth/login` | Công khai | Body: `{ email, password }` | Đăng nhập vào hệ thống cho Khách hàng, Nhân viên hoặc Admin. Kiểm tra trạng thái hoạt động của tài khoản (`isActive`), trả về thông tin người dùng cùng `accessToken` và gắn `refreshToken` vào Cookie. |
| `POST` | `/api/auth/refresh` | Công khai (Yêu cầu Cookie) | Cookie: `refreshToken` | Cấp phát lại `accessToken` mới khi token cũ hết hạn (sau 15 phút) mà không bắt người dùng phải đăng nhập lại. |
| `POST` | `/api/auth/logout` | Công khai | Cookie: `refreshToken` | Đăng xuất an toàn khỏi hệ thống: xóa `refreshToken` lưu trong cơ sở dữ liệu và xóa trắng Cookie trên trình duyệt. |
| `GET` | `/api/auth/me` | Đã đăng nhập (`verifyToken`) | Header: `Authorization: Bearer <token>` | Lấy thông tin chi tiết của người dùng đang đăng nhập để khôi phục trạng thái phiên làm việc khi người dùng tải lại trang (F5). |

---

### 5.3. Phân hệ Quản lý Thực đơn & Tùy chọn Món
- **File định tuyến:** `backend/routes/menuRoutes.js` (Tiền tố gốc: `/api/menu-items`)
- **File xử lý nghiệp vụ:** `backend/controllers/menuController.js`
- **File Model dữ liệu:** `backend/models/MenuItem.js`
- **File kiểm thử REST Client:** `backend/test_menu_table.http`

| Phương thức | Đường dẫn (Endpoint) | Quyền truy cập | Dữ liệu đầu vào (Query / Body) | Mục đích chi tiết của API |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/menu-items` | Công khai | Query (tùy chọn): `?type=food\|drink`, `?available=true\|false`, `?search=tu_khoa` | Lấy danh sách toàn bộ món ăn và đồ uống kèm cấu hình tùy chọn (`options`). Phục vụ hiển thị thực đơn cho khách hàng gọi món và bảng quản lý cho Admin. |
| `GET` | `/api/menu-items/:id` | Công khai | Params: `id` (ObjectId của món) | Truy vấn thông tin chi tiết của một món ăn/đồ uống cụ thể theo ID. |
| `PATCH` | `/api/menu-items/:id/availability` | Nhân viên, Admin (`staff`, `admin`) | Params: `id`<br>Body (tùy chọn): `{ isAvailable }` | Giúp nhân viên bếp hoặc thu ngân bật/tắt nhanh trạng thái "Còn món / Tạm hết" ngay trong ca bán hàng khi nguyên liệu hết đột xuất. |
| `POST` | `/api/menu-items` | Chỉ Admin (`admin`) | Body: `{ name, price, type, description, image, isAvailable, options: [{ label, priceDelta }] }` | Thêm mới một món ăn hoặc đồ uống vào thực đơn cửa hàng. Nếu không truyền mảng `options`, hệ thống tự động gán tùy chọn mặc định chuẩn theo loại món (Đồ ăn: Thường/Đặc biệt; Đồ uống: Size M/L/XL). |
| `PUT` | `/api/menu-items/:id` | Chỉ Admin (`admin`) | Params: `id`<br>Body: `{ name, price, type, description, image, isAvailable, options }` | Cập nhật toàn bộ thông tin, giá bán gốc, hình ảnh và cấu hình các mức giá chênh lệch (`priceDelta`) theo kích cỡ/định lượng của món. |
| `DELETE` | `/api/menu-items/:id` | Chỉ Admin (`admin`) | Params: `id` | Xóa vĩnh viễn một món ăn hoặc đồ uống khỏi cơ sở dữ liệu thực đơn. |

---

### 5.4. Phân hệ Quản lý Bàn ăn & Mã QR
- **File định tuyến:** `backend/routes/tableRoutes.js` (Tiền tố gốc: `/api/tables`)
- **File xử lý nghiệp vụ:** `backend/controllers/tableController.js`
- **File Model dữ liệu:** `backend/models/Table.js`
- **File kiểm thử REST Client:** `backend/test_menu_table.http`

| Phương thức | Đường dẫn (Endpoint) | Quyền truy cập | Dữ liệu đầu vào (Query / Body) | Mục đích chi tiết của API |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/tables` | Công khai | Query (tùy chọn): `?active=true` | Lấy danh sách các bàn ăn trong cửa hàng (sắp xếp theo mã bàn tăng dần) để khách chọn bàn hoặc để Admin quản lý và in mã QR. |
| `GET` | `/api/tables/code/:code` | Công khai | Params: `code` (Ví dụ: `T01`) | Xác thực nhanh một mã bàn khi khách hàng quét mã QR tại bàn. Kiểm tra bàn có tồn tại và đang mở phục vụ (`isActive: true`) hay không. |
| `POST` | `/api/tables` | Chỉ Admin (`admin`) | Body: `{ code, name, isActive }` | Tạo thêm bàn ăn mới cho cửa hàng (tự động chuẩn hóa mã bàn sang chữ in hoa và kiểm tra chống trùng mã). |
| `PUT` | `/api/tables/:id` | Chỉ Admin (`admin`) | Params: `id`<br>Body: `{ code, name, isActive }` | Cập nhật tên hiển thị của bàn hoặc đóng/mở trạng thái phục vụ của bàn ăn. |
| `DELETE` | `/api/tables/:id` | Chỉ Admin (`admin`) | Params: `id` | Xóa một bàn ăn khỏi hệ thống quản lý. |

---

### 5.5. Phân hệ Đơn hàng, Điều phối KDS/POS & Thanh toán
- **File định tuyến:** `backend/routes/orderRoutes.js` (Tiền tố gốc: `/api/orders`)
- **File xử lý nghiệp vụ:** `backend/controllers/orderController.js`
- **File Model & Công cụ:** `backend/models/Order.js`, `backend/utils/orderStatus.js`
- **File kiểm thử REST Client:** `backend/test_order.http`

| Phương thức | Đường dẫn (Endpoint) | Quyền truy cập | Dữ liệu đầu vào (Query / Body) | Mục đích chi tiết của API |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Công khai + Hỗ trợ Token (`optionalAuth`, có `orderRateLimiter`) | Body: `{ tableCode, customerName, customerPhone, note, items: [{ menuItemId, quantity, selectedOption }] }` | **Khách gửi đơn đặt món:** Kiểm tra bàn đang hoạt động, kiểm tra từng món còn phục vụ, **tự động tính toán lại đơn giá tại Server** dựa trên giá gốc cộng `priceDelta` của `selectedOption` (chống sửa giá từ phía Client), sinh mã đơn theo ngày (`YYYYMMDD-XXX`), lưu đơn và phát sự kiện Socket `order:new` tới màn hình Bếp. |
| `GET` | `/api/orders/my` | Đã đăng nhập (`verifyToken`) | Header: `Authorization: Bearer <token>` | Cho phép khách hàng đã đăng nhập tài khoản xem lại toàn bộ lịch sử đơn đặt món của cá nhân mình. |
| `GET` | `/api/orders/:id/track` | Công khai | Params: `id` (ObjectId hoặc mã `orderCode`) | Tra cứu thông tin và tiến độ chế biến thời gian thực của một đơn hàng cụ thể (phục vụ trang Theo dõi chi tiết đơn `/track/:orderId`). |
| `POST` | `/api/orders/batch-track` | Công khai | Body: `{ orderIds: ["id1", "id2", ...] }` | Giúp khách vãng lai (không cần đăng nhập) tra cứu đồng loạt toàn bộ các đơn đã gọi trong phiên ngồi ăn tại bàn dựa trên danh sách ID lưu ở trình duyệt. |
| `POST` | `/api/orders/:id/cancel` | Công khai | Params: `id`<br>Body (tùy chọn): `{ cancelReason }` | Cho phép khách hàng **tự hủy đơn hàng** nếu đơn đó vẫn đang ở trạng thái "Chờ xác nhận" (`pending`). Nếu bếp đã bấm nhận làm (`confirmed`), API sẽ từ chối hủy để bảo vệ quy trình bếp. Đồng thời phát Socket `order:updated` báo cho bếp biết đơn đã hủy. |
| `POST` | `/api/orders/request-payment` | Công khai | Body: `{ orderIds: [...], paymentMethod: "cash" \| "transfer" }` | Khách hàng bấm nút **"Gọi Thanh Toán"** tại bàn và chọn hình thức Tiền mặt hoặc Chuyển khoản QR. API đánh dấu `paymentRequested = true` cho tất cả đơn đang phục vụ của bàn và phát tín hiệu ưu tiên `order:payment_requested` tới thu ngân. |
| `GET` | `/api/orders` | Nhân viên, Admin (`staff`, `admin`) | Query (tùy chọn): `?status=...`, `?tableCode=...`, `?date=YYYY-MM-DD` | Cung cấp danh sách đơn hàng cho màn hình **Quản Lý Đơn Hàng (KDS/POS)** của nhân viên và quản trị viên, hỗ trợ lọc theo ngày, trạng thái và mã bàn. |
| `PATCH` | `/api/orders/:id/status` | Nhân viên, Admin (`staff`, `admin`) | Params: `id`<br>Body: `{ status, cancelReason }` | Điều phối chuyển trạng thái đơn hàng theo đúng quy tắc State Machine: `pending` (Chờ xác nhận) -> `confirmed` (Đang chuẩn bị) -> `served` (Đã phục vụ) -> `completed` (Đã thanh toán), hoặc chuyển sang `cancelled` (bắt buộc nhập lý do hủy). Tự động bắn Socket cập nhật trực tiếp lên màn hình điện thoại của khách. |
| `POST` | `/api/orders/settle-table` | Nhân viên, Admin (`staff`, `admin`) | Body: `{ orderIds: ["id1", "id2", ...] }` | Hỗ trợ thu ngân **chốt thanh toán gộp đồng loạt** cho tất cả các đơn hàng chưa thanh toán của một bàn chỉ bằng một thao tác bấm, chuyển toàn bộ sang `completed` và cộng vào doanh thu thực thu. |

---

### 5.6. Phân hệ Quản lý Nhân viên
- **File định tuyến:** `backend/routes/staffRoutes.js` (Tiền tố gốc: `/api/staff`)
- **File xử lý nghiệp vụ:** `backend/controllers/staffController.js`
- **File kiểm thử REST Client:** `backend/test_staff.http`

| Phương thức | Đường dẫn (Endpoint) | Quyền truy cập | Dữ liệu đầu vào (Params / Body) | Mục đích chi tiết của API |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/staff` | Chỉ Admin (`admin`) | Header: `Authorization: Bearer <token>` | Lấy danh sách toàn bộ tài khoản nhân viên (`role: "staff"`) trong cửa hàng để Admin kiểm soát nhân sự. |
| `POST` | `/api/staff` | Chỉ Admin (`admin`) | Body: `{ name, email, phone, password }` | Admin tạo mới một tài khoản nhân viên thu ngân/phục vụ/bếp với vai trò cố định là `staff`. |
| `PATCH` | `/api/staff/:id/status` | Chỉ Admin (`admin`) | Params: `id`<br>Body (tùy chọn): `{ isActive }` | Admin khóa tạm thời (`isActive: false`) hoặc mở khóa lại (`isActive: true`) quyền đăng nhập của một nhân viên. |
| `DELETE` | `/api/staff/:id` | Chỉ Admin (`admin`) | Params: `id` | Admin xóa vĩnh viễn tài khoản của nhân viên đã nghỉ việc khỏi hệ thống. |

---

## 6. Cơ Chế Realtime Socket.IO

Được định nghĩa tại `backend/socket/index.js`, hệ thống chia các kết nối thời gian thực thành các phòng (Rooms) riêng biệt để tối ưu hiệu năng và bảo mật:

1. **Phòng Nhân viên & Quản trị (`staff-room`):**
   - Khi Admin hoặc Nhân viên mở màn hình `/admin/orders`, trình duyệt phát sự kiện `staff:join`.
   - Nhận sự kiện `order:new`: Khi có bất kỳ bàn nào vừa gửi đơn mới, bảng KDS lập tức thêm thẻ đơn vào danh sách và hiển thị thông báo nổi (Toast) kèm âm báo/nhãn cảnh báo.
   - Nhận sự kiện `order:payment_requested`: Khi khách tại bàn bấm gọi thanh toán, thẻ đơn của bàn đó lập tức được đẩy lên vị trí ưu tiên số 1 kèm nhãn đỏ "KHÁCH GỌI THANH TOÁN".
   - Nhận sự kiện `order:updated`: Đồng bộ tức thì khi một nhân viên khác chuyển trạng thái đơn hoặc khi khách hàng tự hủy đơn `pending`.

2. **Phòng Theo dõi Đơn của Khách hàng (`order:<orderId>`):**
   - Khi khách hàng đặt đơn xong, trình duyệt tự động đăng ký lắng nghe các phòng tương ứng với từng mã đơn trong phiên ăn (`order:join`).
   - Nhận sự kiện `order:updated`: Ngay khi Bếp bấm "Xác nhận & Chế biến", "Đã giao món" hoặc Thu ngân bấm "Đã thu tiền", thanh tiến độ 4 bước trên màn hình điện thoại của khách tự động nhảy bước mà không cần tải lại trang.

---

## 7. Kịch Bản Demo Báo Cáo Bảo Vệ Dự Án

Để buổi thuyết trình và demo trước hội đồng diễn ra mạch lạc, trực quan và thể hiện rõ tính năng Realtime, hãy mở **2 cửa sổ trình duyệt đặt cạnh nhau** trên màn hình máy tính:
- **Cửa sổ Trái (Vai Khách Hàng - Mở chế độ Ẩn danh / Incognito):** Truy cập `http://localhost:5173/?table=T01` (Giả lập khách vừa ngồi vào **Bàn 01** và quét mã QR trên bàn).
- **Cửa sổ Phải (Vai Bếp & Thu Ngân - Trình duyệt chính):** Truy cập `http://localhost:5173/login`, đăng nhập bằng tài khoản Admin (`admin@shop.com` / `admin123`), hệ thống tự động chuyển vào trang **Quản Lý Đơn Hàng (`/admin/orders`)**.

---

### Bước 1: Khách hàng quét QR nhận bàn và chọn món theo Size / Định lượng
1. Tại **Cửa sổ Trái (Khách hàng)**:
   - Chỉ cho hội đồng thấy thanh điều hướng tự động nhận diện **"Bàn: T01"** nhờ tham số QR `?table=T01`.
   - Thử thanh tìm kiếm thông minh: Gõ không dấu `"pho bo"` hoặc `"bac xiu"`, hệ thống vẫn lọc chính xác món tiếng Việt có dấu.
   - Tại món **Phở Bò Tái Lăn** (Giá gốc 55.000 đ): Bấm chọn nút **"Đặc biệt (+15k)"**, giá trên thẻ tự động cập nhật thành **70.000 đ**, bấm **"+ Thêm Vào Giỏ"**.
   - Tại món **Bạc Xỉu Đá** (Giá gốc 28.000 đ): Bấm chọn **"Size L (+5k)"**, thêm 1 ly; sau đó đổi sang **"Size XL (+10k)"**, thêm tiếp 1 ly.
2. Bấm vào nút **Giỏ hàng** trên thanh menu:
   - Chỉ rõ giỏ hàng tách biệt thông minh cùng một món Bạc Xỉu Đá thành 2 dòng riêng biệt theo từng Size (`Size L` và `Size XL`) với đơn giá chuẩn xác.

---

### Bước 2: Khách gửi đơn & Demo tính năng Khách tự hủy đơn khi chờ xác nhận
1. Tại **Cửa sổ Trái (Khách hàng - Trang Giỏ hàng)**:
   - Điền Họ tên: `Nguyễn Văn A`, SĐT: `0912345678`, Ghi chú: `Ít đá, nước dùng nhiều hành`.
   - Bấm **"Gửi Đơn Cho Nhà Bếp"**.
2. Quan sát đồng thời **Cửa sổ Phải (Màn hình Quản Lý Đơn Hàng của Bếp)**:
   - Ngay lập tức (không cần F5), một thông báo nổi xuất hiện và thẻ đơn mới `YYYYMMDD-001` của **Bàn 01** hiện lên ở khu vực **"Đơn Đang Phục Vụ"** với trạng thái vàng **"Chờ xác nhận"**.
3. Quay lại **Cửa sổ Trái (Khách hàng)**:
   - Giải thích tình huống thực tế: Khách vừa gửi đơn xong nhưng chợt nhớ ra muốn đổi món và bếp vẫn chưa bấm làm (`Chờ xác nhận`).
   - Khách bấm nút **"Hủy Đơn"** -> Chọn **"Hủy và khôi phục lại món vào giỏ để đặt lại"**.
   - Kết quả: Đơn `001` chuyển sang **"Đã hủy"** trên cả màn hình khách lẫn màn hình bếp, đồng thời toàn bộ 3 món vừa rồi được trả lại nguyên vẹn vào giỏ hàng của khách để chỉnh sửa.

---

### Bước 3: Khách gửi lại đơn chính thức & Bếp điều phối chế biến, giao món
1. Tại **Cửa sổ Trái (Khách hàng)**:
   - Khách tăng số lượng Phở Bò Đặc Biệt lên 2 bát, sau đó bấm **"Gửi Đơn Cho Nhà Bếp"**. Đơn mới `YYYYMMDD-002` được tạo.
2. Tại **Cửa sổ Phải (Bếp / Thu ngân)**:
   - Đơn `002` xuất hiện ở đầu danh sách **"Đơn Đang Phục Vụ"** kèm đồng hồ đếm thời gian chờ (SLA Timer: `Vừa xong`).
   - Nhân viên bếp bấm nút **"Xác nhận & Chế biến"**:
     - Trạng thái đơn trên màn hình Bếp đổi sang xanh dương **"Đang chuẩn bị"**.
     - Cùng lúc đó bên **Cửa sổ Trái (Khách hàng)**, thanh tiến độ 4 bước tự động nhảy sang bước 2 (**"Đang chuẩn bị"**) và nút "Hủy Đơn" của khách tự động biến mất (do bếp đã nấu, khách không thể tự ý hủy nữa).
   - Sau khi nấu xong, nhân viên bưng ra bàn và bấm nút **"Đã giao món (Chờ TT)"**:
     - Trạng thái đơn chuyển sang **"Đã phục vụ"**, bộ đếm số lượng trên thẻ tóm tắt "Đã Phục Vụ (Chờ Thu Tiền)" tăng lên.

---

### Bước 4: Khách gọi thêm món đợt 2 trong lúc đang ăn
1. Tại **Cửa sổ Trái (Khách hàng)**:
   - Trong lúc đang ăn, khách bấm **"+ Chọn Thêm Món"**, chọn thêm 1 đĩa **Hướng Dương** và bấm gửi đơn mới (`YYYYMMDD-003`).
   - Trong trang Giỏ hàng của khách lúc này hiển thị gộp cả 2 đơn (`002` và `003`) trong cùng một phiên của **Bàn 01** và tự động cộng tổng tiền tạm tính của cả bàn.
2. Tại **Cửa sổ Phải (Bếp)**:
   - Bếp bấm **"Xác nhận & Chế biến"** rồi **"Đã giao món (Chờ TT)"** cho đơn `003`.

---

### Bước 5: Khách bấm "Gọi Thanh Toán" & Thu ngân chốt thu tiền tại bàn
1. Tại **Cửa sổ Trái (Khách hàng)**:
   - Khi dùng bữa xong, tại khung **Tổng Tạm Tính Bàn**, khách chọn hình thức **"Chuyển khoản QR"** (hoặc **"Tiền mặt"**) rồi bấm nút **"Gọi Nhân Viên Thanh Toán"**.
2. Quan sát **Cửa sổ Phải (Màn hình Thu ngân)**:
   - Hệ thống phát thông báo nổi màu đỏ báo **Bàn 01 yêu cầu thanh toán** kèm tổng số tiền và phương thức Chuyển khoản.
   - Các thẻ đơn của Bàn 01 lập tức được gắn nhãn đỏ **"KHÁCH GỌI THANH TOÁN - Chuyển khoản"** và tự động đẩy lên vị trí đầu tiên của bảng điều phối.
3. Thu ngân kiểm tra và bấm nút **"Xác nhận Đã Thu Tiền"**:
   - Đơn hàng chuyển sang trạng thái **"Đã thanh toán"**, tự động rút khỏi khu vực "Đơn Đang Phục Vụ" và chuyển xuống bảng **"Đơn Đã Đóng (Đã Thanh Toán / Đã Hủy)"** phía dưới để lưu trữ gọn gàng.
   - Chỉ số **"Doanh Thu Đã Thu"** trên thẻ thống kê trên cùng lập tức cộng thêm số tiền vừa thu.
4. Quan sát **Cửa sổ Trái (Khách hàng)**:
   - Thanh tiến độ nhảy sang bước cuối **"Hoàn tất"** với thông báo cảm ơn quý khách và bộ đếm ngược 60 giây tự động dọn sạch phiên ăn cũ để sẵn sàng đón lượt khách tiếp theo vào bàn.

---

### Bước 6: Demo nhanh các phân hệ Quản trị khác (Admin)
Trên **Cửa sổ Phải (Admin)**, chuyển qua các tab còn lại trên thanh quản trị:
1. **Tab "Quản Lý Thực Đơn" (`/admin/menu`):**
   - Trình diễn phân trang (8 món/trang), lọc theo Đồ ăn / Đồ uống.
   - Bấm công tắc đổi nhanh trạng thái **"Còn món" -> "Hết món"**, bên màn hình khách món đó lập tức hiện nhãn **"Tạm hết"** và khóa nút đặt.
   - Bấm **"+ Thêm Món Mới"** để cho hội đồng thấy form cấu hình linh hoạt các tùy chọn kích cỡ/định lượng (`options`).
2. **Tab "Bàn Ăn & Mã QR" (`/admin/tables`):**
   - Hiển thị danh sách bàn từ Bàn 01 đến Bàn 10 kèm mã QR tự động sinh cho từng bàn và nút **"In Mã QR"**.
3. **Tab "Quản Lý Nhân Viên" (`/admin/staff`):**
   - Tạo mới tài khoản cho nhân viên thu ngân hoặc khóa/mở khóa tài khoản nhân viên.

---

## 8. Kiểm Thử Tự Động (Unit & Integration Tests)

Dự án đi kèm bộ kiểm thử tự động trong thư mục `backend/tests/` để xác minh tính đúng đắn của logic nghiệp vụ:

```bash
cd backend

# 1. Kiểm thử logic tùy chọn món (Size M/L/XL, Thường/Đặc biệt) và tính giá chênh lệch
node tests/test_options_unit.js

# 2. Kiểm thử logic khách tự hủy đơn pending, batch-track và luồng trạng thái thanh toán
node tests/test_cancel_and_batch.js
```

Ngoài ra, có thể sử dụng tiện ích **REST Client** trên VS Code để chạy trực tiếp các file kịch bản kiểm thử HTTP có sẵn trong thư mục `backend/`:
- `backend/test_auth.http`: Kiểm thử Đăng ký, Đăng nhập, Refresh Token, Logout.
- `backend/test_menu_table.http`: Kiểm thử CRUD Thực đơn và Bàn ăn.
- `backend/test_order.http`: Kiểm thử tạo đơn, cập nhật trạng thái đơn và phân quyền.
- `backend/test_staff.http`: Kiểm thử quản lý tài khoản nhân viên.
