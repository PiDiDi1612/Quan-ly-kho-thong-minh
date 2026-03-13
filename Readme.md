<div align="center">

# 📦 SmartStock WMS
### Hệ thống Quản lý Kho Thông minh

[![Version](https://img.shields.io/badge/version-3.7.0-emerald?style=for-the-badge)](https://github.com/PiDiDi1612/Quan-ly-kho-thong-minh)
[![License](https://img.shields.io/badge/license-Private-red?style=for-the-badge)]()
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=for-the-badge)](https://github.com/PiDiDi1612/Quan-ly-kho-thong-minh)
[![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20SQLite-purple?style=for-the-badge)]()

> Phần mềm quản lý kho nội bộ dành cho doanh nghiệp — chạy offline, đồng bộ realtime qua mạng LAN, không phụ thuộc internet.

<!-- 📸 THÊM ẢNH CHỤP MÀN HÌNH APP VÀO ĐÂY -->
<!-- ![SmartStock Dashboard](docs/screenshots/dashboard.png) -->

</div>

---

## ✨ Tính năng nổi bật

### 🏭 Quản lý kho
- Quản lý vật tư theo **3 xưởng**: OG, CK, NT
- Phân loại vật tư chính / vật tư phụ
- Cảnh báo tồn kho thấp tự động
- Hợp nhất vật tư trùng lặp
- Import/Export dữ liệu từ Excel

### 📋 Lập phiếu & Phê duyệt
- Lập phiếu **nhập kho / xuất kho / điều chuyển**
- Workflow duyệt phiếu: Staff tạo → Manager/Admin duyệt → Tồn kho mới trừ
- Mã phiếu tự động theo định dạng `PXK/OG/25/00001`
- In phiếu trực tiếp từ ứng dụng

### 📊 Báo cáo & Thống kê
- Dashboard biểu đồ nhập/xuất 7 ngày gần đây
- Lịch sử giao dịch với bộ lọc nâng cao
- Báo cáo tồn kho theo kỳ
- Xuất báo cáo ra file Excel

### 🔒 Bảo mật & Phân quyền
- Xác thực JWT (token hết hạn sau 4 giờ)
- 4 cấp quyền: **Admin → Manager → Warehouse → Staff**
- Mã hóa mật khẩu PBKDF2 + Salt (120,000 iterations)
- Nhật ký hoạt động đầy đủ
- Rate limiting: tối đa 10 lần đăng nhập sai / 15 phút

### 💾 Sao lưu & Khôi phục
- **Tự động backup** lúc 23:30 mỗi đêm
- Lưu tối đa 30 bản gần nhất
- Khôi phục dữ liệu 1 click
- Thông báo realtime khi backup hoàn tất

### 🌐 Đồng bộ mạng LAN
- Server chạy trên 1 máy, nhiều máy trạm kết nối
- Đồng bộ realtime qua **WebSocket**
- Hiển thị số máy đang kết nối trên System Tray
- Thu nhỏ xuống khay hệ thống khi đóng cửa sổ

---

## 🛠️ Công nghệ sử dụng

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron |
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Backend | Express.js |
| Database | SQLite (better-sqlite3) + WAL mode |
| Auth | JWT + PBKDF2 |
| Realtime | Socket.IO |
| Scheduler | node-cron |
| Testing | Vitest |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu hệ thống
- Windows 10/11 (64-bit)
- Node.js 18+ 
- RAM tối thiểu 4GB

### Cài đặt lần đầu

```bash
# 1. Clone repository
git clone https://github.com/PiDiDi1612/Quan-ly-kho-thong-minh.git
cd Quan-ly-kho-thong-minh

# 2. Cài dependencies
npm install

# 3. Tạo file .env
cp .env.example .env
# Mở .env và điền JWT_SECRET (bắt buộc)

# 4. Chạy ở chế độ development
npm run dev
```

### Build ra file cài đặt (.exe)

```bash
# Build frontend trước
npm run build

# Đóng gói Electron
npm run electron:build
```

File cài đặt sẽ xuất hiện trong thư mục `release/`.

---

## ⚙️ Cấu hình

Tạo file `.env` từ `.env.example`:

```env
# Bắt buộc — JWT Secret (tạo bằng: openssl rand -hex 32)
JWT_SECRET=your_super_secret_key_here

# Port server (mặc định: 3000)
PORT=3000

# Mật khẩu admin mặc định (chỉ dùng khi khởi tạo DB lần đầu)
ADMIN_DEFAULT_PASSWORD=SmartStock@2026!

# Thư mục lưu backup (mặc định: ./backup)
BACKUP_DIR=

# Số bản backup tối đa (mặc định: 30)
BACKUP_MAX_COUNT=30
```

> ⚠️ **Quan trọng:** Đổi mật khẩu admin ngay sau khi cài đặt lần đầu!

---

## 👥 Phân quyền người dùng

| Role | Xem kho | Lập phiếu | Duyệt phiếu | Quản lý user | Cài đặt |
|------|---------|-----------|-------------|--------------|---------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Warehouse** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Staff** | ✅ | ⏳ Chờ duyệt | ❌ | ❌ | ❌ |

---

## 🌐 Kết nối mạng LAN

```
┌─────────────────┐         LAN Network
│   Máy Server    │◄────────────────────┐
│  (chạy app)     │                     │
│  IP: 192.168.x.x│             ┌───────┴──────┐
│  Port: 3000     │             │  Máy trạm 1  │
└─────────────────┘             │  Máy trạm 2  │
                                │  Máy trạm N  │
                                └──────────────┘
```

**Cách kết nối:**
1. Mở app trên máy Server → chọn chế độ **Server**
2. Ghi lại IP hiển thị góc trên phải (VD: `192.168.1.100`)
3. Mở app trên máy trạm → chọn **Client** → nhập IP máy Server

---

## 📁 Cấu trúc dự án

```
Quan-ly-kho-thong-minh/
├── electron/
│   └── main.cjs           # Electron main process + System Tray
├── src/
│   ├── features/          # Các màn hình chính
│   │   ├── approval/      # Duyệt phiếu xuất kho
│   │   ├── inventory/     # Kiểm kê kho
│   │   ├── warehouse/     # Kho vật tư, lập phiếu, NCC
│   │   ├── planning/      # Dự án, dự toán
│   │   └── admin/         # Quản lý người dùng
│   ├── components/        # UI components dùng chung
│   ├── domain/            # Business logic & services
│   ├── repositories/      # Data access layer
│   └── types/             # TypeScript types
├── server.cjs             # Backend Express + SQLite
├── .env.example           # Template cấu hình
└── docs/                  # Tài liệu hướng dẫn
```

---

## 🧪 Chạy Tests

```bash
# Chạy tất cả unit tests
npm run test

# Chạy với UI
npm run test:ui

# Xem coverage
npm run test:coverage
```

---

## 📝 Changelog

### v3.7.0 (Latest)
- ✅ Thêm module **Kiểm kê kho** với biên bản chênh lệch
- ✅ Thêm **Workflow duyệt phiếu** cho Staff
- ✅ **Auto backup** lúc 23:30 hàng ngày + khôi phục 1 click
- ✅ **System Tray** — thu nhỏ thay vì thoát khi đóng cửa sổ
- ✅ Biểu đồ nhập/xuất 7 ngày trên Dashboard
- ✅ Rate limiting chống brute force đăng nhập
- ✅ Input validation phía server

### v3.6.0
- ✅ Thêm RBAC phân quyền 4 cấp
- ✅ Đồng bộ realtime qua WebSocket
- ✅ Dark mode

---

## 👨‍💻 Tác giả

**Phạm Đức Duy**

Dự án nội bộ — không thương mại.

---

<div align="center">

Made with ❤️ using React + Electron + SQLite

</div>
