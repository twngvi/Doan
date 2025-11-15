# 🚀 Hướng dẫn Deploy Web App

## 📋 Chuẩn bị

### 1. Cài đặt clasp (nếu chưa có)

```bash
npm install -g @google/clasp
clasp login
```

### 2. Kiểm tra cấu trúc file

Đảm bảo thư mục `backend/` có các file sau:

```
backend/
├── main.gs              # Entry point & doGet()
├── users.gs             # User registration & login
├── utils.gs             # Utility functions
├── index.html           # Main SPA container
├── styles.html          # CSS & Tailwind
├── client_js.html       # Client-side JavaScript
├── page_login.html      # Login page
├── page_register.html   # Register page
├── page_dashboard.html  # Dashboard page
├── page_topics.html     # Topics page (placeholder)
├── page_mcq.html        # MCQ page (placeholder)
├── page_matching.html   # Matching page (placeholder)
└── page_profile.html    # Profile page (placeholder)
```

## 🔧 Bước 1: Cập nhật .clasp.json

Đảm bảo file `.clasp.json` có cấu hình đúng:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "backend",
  "scriptExtensions": [".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"]
}
```

## 📤 Bước 2: Push code lên Google Apps Script

```bash
# Di chuyển vào thư mục dự án
cd e:\Doanv3

# Push tất cả file lên Google Apps Script
clasp push

# Kiểm tra xem đã push thành công chưa
clasp status
```

## 🗄️ Bước 3: Khởi tạo Database

### Cách 1: Chạy từ Apps Script Editor

1. Mở Apps Script Editor:

   ```bash
   clasp open
   ```

2. Chọn file `schema.js` hoặc `Code.js`

3. Chạy function `initializeDatabase()`:

   - Chọn function trong dropdown
   - Click "Run"
   - Cấp quyền truy cập khi được yêu cầu

4. Kiểm tra Google Drive, sẽ thấy file `DB_Master` được tạo

### Cách 2: Chạy từ command line

```bash
clasp run initializeDatabase
```

### Kết quả mong đợi

Google Sheets `DB_Master` được tạo với các sheet:

- **Users**: Bảng người dùng
- **Topics**: Bảng chủ đề
- **MCQ_Questions**: Bảng câu hỏi trắc nghiệm
- **Matching_Pairs**: Bảng ghép nối
- **Logs**: Bảng log hệ thống
- **Template_UserProgress**: Template tiến độ người dùng

## 🌐 Bước 4: Deploy Web App

### Từ Apps Script Editor:

1. Mở Apps Script Editor:

   ```bash
   clasp open
   ```

2. Click **Deploy** > **New deployment**

3. Chọn type: **Web app**

4. Cấu hình deployment:

   - **Description**: Doanv3 Web App v1.0
   - **Execute as**: Me (your_email@gmail.com)
   - **Who has access**: Anyone

5. Click **Deploy**

6. Xác nhận quyền truy cập

7. Copy **Web app URL** (dạng: https://script.google.com/macros/s/.../exec)

### Từ Command Line (clasp):

```bash
# Deploy version mới
clasp deploy --description "Doanv3 v1.0"

# Xem danh sách deployment
clasp deployments

# Mở web app URL
clasp open --webapp
```

## ✅ Bước 5: Test Web App

### 1. Mở Web App URL

Truy cập URL nhận được từ bước deploy

### 2. Test Flow Đăng ký

1. Click "Đăng ký ngay"
2. Điền form:
   - Họ tên: Nguyễn Văn A
   - Username: user001
   - Email: user001@gmail.com
   - Password: 123456
   - Confirm Password: 123456
3. Click "Đăng ký"
4. Kiểm tra:
   - Toast "Đăng ký thành công"
   - Tự động chuyển tới Dashboard
   - Sheet `Users` có thêm record mới
   - Sheet `Progress_USR001` được tạo

### 3. Test Flow Đăng xuất

1. Click "Đăng xuất"
2. Kiểm tra:
   - Quay về trang Login
   - localStorage đã xóa

### 4. Test Flow Đăng nhập

1. Nhập username: user001
2. Nhập password: 123456
3. Click "Đăng nhập"
4. Kiểm tra:
   - Toast "Đăng nhập thành công"
   - Chuyển tới Dashboard
   - Hiển thị đúng tên user
   - lastLogin được cập nhật trong sheet

## 🔍 Bước 6: Debug (nếu có lỗi)

### Xem Logs

```bash
# Xem logs realtime
clasp logs

# Hoặc xem trong Apps Script Editor
# View > Logs
```

### Các lỗi thường gặp:

#### Lỗi: "Script function not found: doGet"

**Nguyên nhân**: File `main.gs` chưa được push
**Giải pháp**:

```bash
clasp push --force
```

#### Lỗi: "You do not have permission to call..."

**Nguyên nhân**: Chưa cấp quyền OAuth
**Giải pháp**: Click vào link trong error message và cấp quyền

#### Lỗi: "Cannot read property 'getSheetByName'"

**Nguyên nhân**: Database chưa được khởi tạo
**Giải pháp**: Chạy `initializeDatabase()` trong Apps Script Editor

#### Lỗi: "google.script.run is not defined"

**Nguyên nhân**: Đang test bằng file HTML local thay vì Web App URL
**Giải pháp**: Phải deploy và test qua Web App URL

## 📊 Bước 7: Kiểm tra Database

1. Mở Google Drive
2. Tìm file `DB_Master`
3. Kiểm tra các sheet:
   - **Users**: Có user vừa đăng ký
   - **Progress_USR001**: Sheet tiến độ đã được tạo
   - **Logs**: Có log đăng ký và đăng nhập

## 🔄 Update sau khi sửa code

```bash
# Sửa code trong backend/

# Push lên Apps Script
clasp push

# Deploy version mới
clasp deploy --description "Update v1.1"

# Hoặc update deployment hiện tại
clasp deploy --deploymentId <DEPLOYMENT_ID> --description "Update v1.1"
```

## 📱 Chia sẻ Web App

### URL công khai:

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Chia sẻ URL này cho users để truy cập hệ thống

### Lưu ý bảo mật:

- Password được hash bằng SHA-256
- Session được lưu trong localStorage
- Cần implement JWT hoặc Session token cho production
- Consider thêm reCAPTCHA cho form đăng ký/đăng nhập

## 🎉 Hoàn tất!

Web App đã sẵn sàng sử dụng với các tính năng:

- ✅ Đăng ký tài khoản
- ✅ Đăng nhập
- ✅ Dashboard
- ✅ Auto-create user progress sheet
- ✅ Logging activities
- 🔧 Topics, MCQ, Matching (ready for implementation)

## 🚀 Next Steps

1. Implement Topics page (CRUD operations)
2. Implement MCQ page (quiz generation & submission)
3. Implement Matching Game
4. Add user profile editing
5. Add progress tracking and analytics
6. Implement admin panel
7. Add more security features (JWT, rate limiting)
