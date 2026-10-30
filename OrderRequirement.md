# TÀI LIỆU ĐẶC TẢ DỰ ÁN
### Lưu ý sản phẩm càng dễ dùng và đơn giản sử dụng cầng tốt, không cần phải làm nhiều tính năng khó và phức tạp.
## ĐỀ TÀI: QUẢN LÝ ORDER ĐỒ ĂN, ĐỒ UỐNG CHO CỬA HÀNG

---

### I. Bối cảnh & Lý do chọn đề tài
* **Bối cảnh:** Quy trình gọi món truyền thống bằng menu giấy hoặc ghi chép thủ công dễ phát sinh sai sót, nhầm lẫn đơn khi quán đông khách và làm tăng thời gian chờ đợi.
* **Lý do chọn đề tài:** Xây dựng website gọi món tại chỗ giúp khách hàng chủ động chọn món, đồng thời hỗ trợ nhân viên tiếp nhận đơn nhanh chóng, chính xác và tối ưu chi phí vận hành cho cửa hàng.

---

### II. Mục tiêu dự án
* **Về mặt vận hành:** Số hóa quy trình order tại cửa hàng, giảm thiểu thời gian chờ và hạn chế tối đa tình trạng sót hoặc nhầm lẫn đơn hàng.
* **Về mặt kỹ thuật:** Xây dựng hoàn chỉnh một ứng dụng web full-stack có kiến trúc rõ ràng, hỗ trợ đầy đủ các thao tác CRUD và bảo mật bằng cơ chế phân quyền hai nhóm vai trò.

---

### III. Đối tượng người dùng (Actors)
* **Khách hàng (User):** Người trực tiếp dùng website tại cửa hàng để xem thực đơn và đặt món.
* **Nhân viên / Quản trị viên (Admin/Staff):** Người tiếp nhận, kiểm tra đơn hàng gửi về và quản trị danh mục món ăn, đồ uống của quán.

---

### IV. Yêu cầu chức năng chính

#### 1. Phân hệ Khách hàng (User)
* Xem danh sách thực đơn đồ ăn, đồ uống (kèm giá bán, hình ảnh, mô tả chi tiết).
* Thêm món vào giỏ hàng, tùy chỉnh số lượng món.
* Sửa đổi hoặc xóa món khỏi giỏ hàng/đơn đặt trước khi gửi.
* Gửi đơn order đến hệ thống của cửa hàng.

#### 2. Phân hệ Quản trị / Nhân viên (Admin)
* Đăng nhập hệ thống, quản lý phiên làm việc an toàn.
* Tiếp nhận danh sách đơn đặt món theo thời gian thực và thực hiện xác minh đơn hàng.
* Quản lý thực đơn (CRUD món):
  * Thêm món ăn, đồ uống mới.
  * Cập nhật thông tin, giá cả và trạng thái còn món / hết món.
  * Xóa món khỏi thực đơn của cửa hàng.

---

### V. Yêu cầu phi chức năng
* **Hiệu năng:** Tốc độ phản hồi API nhanh (dưới 1 giây cho các tác vụ truy vấn thực đơn và tạo đơn cơ bản).
* **Bảo mật:** Kiểm tra và làm sạch dữ liệu đầu vào, mã hóa mật khẩu tài khoản, bảo vệ các API quản trị bằng cơ chế xác thực Token.
* **Giao diện (UI/UX):** Trực quan, dễ sử dụng, thiết kế Responsive tương thích tốt trên điện thoại di động và máy tính bảng tại bàn.
* **Độ tin cậy & Toàn vẹn:** Dữ liệu đơn hàng và thực đơn luôn đồng bộ chính xác, không trùng lặp hay mất mát dữ liệu đơn hàng.

---

### VI. Công nghệ đề xuất
* **Frontend:** React (xây dựng giao diện Single Page Application linh hoạt, phản hồi mượt mà).
* **Backend:** Node.js kết hợp Express, thiết kế theo chuẩn kiến trúc RESTful API.
* **Cơ sở dữ liệu:**
  * **MongoDB (NoSQL):** Lưu trữ dữ liệu dạng document linh hoạt (thực đơn, đơn hàng, tài khoản).
  * **Mongoose:** Thư viện ODM (Object Data Modeling) hỗ trợ định nghĩa Schema và thao tác dữ liệu an toàn.
  * **MongoDB Compass:** Công cụ giao diện đồ họa (GUI) trực quan hóa, kiểm tra và quản lý dữ liệu.
* **Xác thực & Phân quyền(Tuỳ chọn không ép khách hàng đăng kí tài khoản mới dùng được hệ thống):** JWT (JSON Web Token) triển khai theo cơ chế kết hợp:
  * **Access Token:** Có thời hạn ngắn, dùng để xác thực và cấp quyền gọi API.
  * **Refresh Token:** Lưu trữ an toàn, dùng để cấp phát lại Access Token khi hết hạn mà không bắt buộc người dùng đăng nhập lại liên tục.
  * **Làm được đăng kí tài khoản bằng google càng tốt.**

### VII. GITHUB
* **Tạo 1 repository mới:** Trước khi tạo folder Project trên máy local thì hãy tạo 1 repository mới và clone nó về. Ta sẽ làm việc ở repository đó. Tạo nhánh main và push code lần đầu lên

* **Quy trình tạo nhánh và merge code:** Trước khi làm giai đoạn tiếp theo chúng ta sẽ quản lý như sau: Tạo mới 1 nhánh tính năng/module mới, trước khi làm 1 chức năng mới hay 1 module mới thì sẽ tạo 1 nhánh có tên trùng với tên module hoặc tính năng mới. Trong quá trình phát triển tính năng đó ta sẽ push code lên nhánh của tính năng/module đó. Sau khi làm hoàn thiện sẽ merge vào nhánh main thì sẽ xoá nhánh tính năng/module đi đó. Làm tương tự với các tính năng/module phía sau cho đến khi xong project.

* **Lệnh:**
 - Tạo và chuyển sang nhánh mới: 
  git checkout -b feature/featureName

 - Trong khi làm và khi làm xong tính năng (Commit & Push lên nhánh tính năng):
  git add .
  git commit -m "feat(featureName): complete...."
  git push -u origin feature/featureName

 - Sau khi kiểm tra mọi test pass (Merge vào main):
 # 1. Chuyển về nhánh main
 git checkout main

 # 2. Gộp nhánh tính năng vào main
 git merge feature/auth

 # 3. Đẩy nhánh main đã cập nhật lên GitHub
 git push origin main

 - Xoá nhánh tính năng để giữ Git luôn sạch sẽ:
  # 1. Xoá nhánh ở máy local của bạn
  git branch -d feature/featureName

  # 2. Xoá nhánh trên GitHub
  git push origin --delete feature/featureName