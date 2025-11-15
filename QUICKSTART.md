# 🚀 Quick Start Guide - Doanv3 Web App

## Tóm tắt nhanh

Dự án đã tạo một **Single Page Application (SPA)** hoàn chỉnh chạy trên Google Apps Script với:

### ✅ Đã hoàn thành:

#### Backend (Google Apps Script - .gs files):

- ✅ `main.gs`: Entry point, xử lý `doGet()` để serve web app
- ✅ `users.gs`: Đăng ký, đăng nhập, quản lý user
- ✅ `utils.gs`: Helper functions (hash password, generate ID, logging)

#### Frontend (HTML files):

- ✅ `index.html`: Vỏ SPA, container cho tất cả pages
- ✅ `styles.html`: CSS với Tailwind CDN
- ✅ `client_js.html`: JavaScript client-side
- ✅ `page_login.html`: Trang đăng nhập
- ✅ `page_register.html`: Trang đăng ký
- ✅ `page_dashboard.html`: Trang dashboard
- ✅ Các trang placeholder: Topics, MCQ, Matching, Profile

#### Configuration:

- ✅ `appsscript.json`: Đã cập nhật với webapp config
- ✅ `.clasp.json.example`: Template cho deployment

---

## 📝 Các bước Deploy

### Bước 1: Cập nhật .clasp.json

Copy từ example file:

```bash
cd e:\Doanv3
copy .clasp.json.example .clasp.json
```

Hoặc cập nhật `.clasp.json` hiện tại, thêm `"rootDir": "backend"`:

```json
{
  "scriptId": "1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5",
  "rootDir": "backend",
  "scriptExtensions": [".gs"],
  "htmlExtensions": [".html"]
}
```

### Bước 2: Push code lên Apps Script

```powershell
cd e:\Doanv3
clasp push
```

**Kết quả**: Tất cả file trong `backend/` sẽ được push lên Apps Script project

### Bước 3: Khởi tạo Database

```powershell
# Mở Apps Script Editor
clasp open
```

Trong Editor:

1. Chọn file `Code.js` hoặc `schema.js`
2. Chọn function `initializeDatabase` từ dropdown
3. Click **Run**
4. Cấp quyền khi được hỏi

**Kết quả**: Google Sheet `DB_Master` được tạo với các bảng:

- Users
- Topics
- MCQ_Questions
- Matching_Pairs
- Logs
- Template_UserProgress

### Bước 4: Deploy Web App

Trong Apps Script Editor:

1. Click **Deploy** → **New deployment**
2. Chọn type: **Web app**
3. Cấu hình:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy **Web App URL**

Hoặc dùng command:

```powershell
clasp deploy --description "Doanv3 v1.0"
clasp open --webapp
```

### Bước 5: Test Web App

Mở Web App URL trong browser

---

## 🧪 Test Flow

### ✅ Flow 1: Đăng ký tài khoản mới

1. Truy cập Web App URL
2. Click **"Đăng ký ngay"**
3. Điền form:
   ```
   Họ tên: Nguyễn Văn A
   Username: testuser01
   Email: test@gmail.com
   Password: 123456
   Confirm Password: 123456
   ```
4. Click **"Đăng ký"**

**Kết quả mong đợi:**

- ✅ Toast hiện "Đăng ký thành công!"
- ✅ Tự động chuyển sang Dashboard
- ✅ Hiển thị tên user: "Xin chào, Nguyễn Văn A!"
- ✅ Sheet `Users` có record mới
- ✅ Sheet `Progress_USR001` được tạo tự động
- ✅ Sheet `Logs` có log "REGISTER"

### ✅ Flow 2: Đăng xuất

1. Ở Dashboard, click **"Đăng xuất"**

**Kết quả mong đợi:**

- ✅ Toast hiện "Đã đăng xuất"
- ✅ Quay về trang Login
- ✅ localStorage đã bị xóa

### ✅ Flow 3: Đăng nhập lại

1. Nhập username: `testuser01`
2. Nhập password: `123456`
3. Click **"Đăng nhập"**

**Kết quả mong đợi:**

- ✅ Toast hiện "Đăng nhập thành công!"
- ✅ Chuyển sang Dashboard
- ✅ Hiển thị đúng tên user
- ✅ Sheet `Users` cột `lastLogin` được cập nhật
- ✅ Sheet `Logs` có log "LOGIN"

---

## 🔍 Kiểm tra Database

### Mở Google Sheet DB_Master

```powershell
# Lấy Spreadsheet URL từ logs
clasp logs
```

Hoặc tìm trong Google Drive: **DB_Master**

### Kiểm tra Sheet Users

| userId | username   | email          | passwordHash | fullName     | role    | createdAt   | lastLogin   | isActive |
| ------ | ---------- | -------------- | ------------ | ------------ | ------- | ----------- | ----------- | -------- |
| USR001 | testuser01 | test@gmail.com | [hash]       | Nguyễn Văn A | student | [timestamp] | [timestamp] | TRUE     |

### Kiểm tra Sheet Progress_USR001

Sheet riêng cho user, có header:

```
progressId | userId | topicId | activityType | completedAt | score | timeSpent | attempts | isCompleted | accuracyRate | streakCount
```

### Kiểm tra Sheet Logs

| logId  | timestamp | level | category | userId | action   | details                         |
| ------ | --------- | ----- | -------- | ------ | -------- | ------------------------------- |
| LOG001 | [time]    | INFO  | USER     | USR001 | REGISTER | New user registered: testuser01 |
| LOG002 | [time]    | INFO  | USER     | USR001 | LOGIN    | User logged in: testuser01      |

---

## 🎨 UI Features

### Trang Login

- Form đăng nhập với validation
- Link "Quên mật khẩu?" (placeholder)
- Link "Đăng ký ngay" → chuyển sang page register
- Remember me checkbox

### Trang Register

- Form đăng ký với validation đầy đủ
- Kiểm tra password confirmation
- Checkbox "Đồng ý điều khoản"
- Link "Đăng nhập ngay" → chuyển về login

### Trang Dashboard

- Navigation bar với menu: Dashboard, Topics, MCQ, Matching, Profile
- Hiển thị tên user và nút Đăng xuất
- 4 stat cards: Tổng chủ đề, Hoạt động hoàn thành, Điểm TB, Chuỗi ngày học
- 3 quick action cards: Xem chủ đề, Làm bài trắc nghiệm, Chơi ghép nối
- Section "Hoạt động gần đây" (placeholder)

### UI Components

- Toast notifications (success, error, info, warning)
- Loading overlay với spinner
- Smooth page transitions
- Responsive design (Tailwind CSS)
- Hover effects và animations

---

## 🔧 Troubleshooting

### Lỗi: "google.script.run is not defined"

**Nguyên nhân**: Đang test file HTML local  
**Giải pháp**: Phải test qua Web App URL sau khi deploy

### Lỗi: "Script function not found: doGet"

**Nguyên nhân**: Chưa push file `main.gs`  
**Giải pháp**:

```powershell
clasp push --force
```

### Lỗi: "Cannot read property 'getSheetByName'"

**Nguyên nhân**: Database chưa được khởi tạo  
**Giải pháp**: Chạy `initializeDatabase()` trong Apps Script Editor

### Lỗi: "You do not have permission..."

**Nguyên nhân**: Chưa cấp quyền OAuth  
**Giải pháp**: Click link trong error message và cấp quyền

---

## 📊 Tech Stack

- **Backend**: Google Apps Script (JavaScript)
- **Database**: Google Sheets
- **Frontend**: HTML5 + Vanilla JavaScript
- **CSS Framework**: Tailwind CSS (CDN)
- **Architecture**: Single Page Application (SPA)
- **Deployment**: Google Apps Script Web App
- **Version Control**: clasp (Command Line Apps Script Projects)

---

## 🚀 Next Steps

### Phase 1: Core Features

- [ ] Implement Topics CRUD
- [ ] Implement MCQ Quiz functionality
- [ ] Implement Matching Game
- [ ] User Profile editing

### Phase 2: Advanced Features

- [ ] Progress tracking & analytics
- [ ] Achievements & badges
- [ ] Leaderboard
- [ ] Admin panel

### Phase 3: Security & Performance

- [ ] JWT authentication
- [ ] Rate limiting
- [ ] Caching strategies
- [ ] Data validation

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs: `clasp logs`
2. Xem DEPLOYMENT_GUIDE.md để biết chi tiết
3. Kiểm tra Google Sheet DB_Master
4. Review Apps Script execution logs

---

## ✅ Checklist Deploy

- [ ] Cập nhật `.clasp.json` với `rootDir: "backend"`
- [ ] Push code: `clasp push`
- [ ] Chạy `initializeDatabase()` trong Apps Script Editor
- [ ] Deploy Web App: Deploy → New deployment → Web app
- [ ] Copy Web App URL
- [ ] Test đăng ký account mới
- [ ] Kiểm tra Sheet Users có record mới
- [ ] Kiểm tra Sheet Progress_USR001 được tạo
- [ ] Test đăng xuất
- [ ] Test đăng nhập lại
- [ ] Kiểm tra Logs sheet

**Chúc bạn deploy thành công! 🎉**
