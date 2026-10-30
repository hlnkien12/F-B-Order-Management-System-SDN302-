# HỆ THỐNG QUẢN LÝ ORDER ĐỒ ĂN, ĐỒ UỐNG (SDN302)

Ứng dụng web Full-stack hỗ trợ khách hàng gọi món tại bàn qua mã QR và hỗ trợ nhân viên/quản trị viên tiếp nhận đơn hàng theo thời gian thực, quản lý thực đơn và bàn ăn.

## Công nghệ sử dụng
- **Frontend:** React (Vite), React-Bootstrap, React Router v6, Axios, Socket.IO Client
- **Backend:** Node.js, Express 5, Mongoose 9 (MongoDB), Socket.IO, JWT (Access + Refresh Token), BcryptJS
- **Kiến trúc:** MVC (Model - View/JSON - Controller) & RESTful API

## Cấu trúc thư mục
- `backend/`: RESTful API Server & Socket.IO (`http://localhost:5000`)
- `frontend/`: Giao diện React Single Page Application (`http://localhost:5173`)