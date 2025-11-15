# ✅ Fix: Không tìm thấy sheet

## 🔧 Đã sửa gì?

### **Vấn đề cũ:**

- `getOrCreateDatabase()` chỉ tạo file "DB_Master"
- **KHÔNG tạo các sheets** (Users, Topics, v.v.)
- Khi đăng nhập Google → Lỗi "Không tìm thấy sheet: Sheet"

### **Giải pháp:**

- ✅ Sửa `getOrCreateDatabase()` trong `server/utils.gs`
- ✅ **Tự động tạo tất cả sheets** nếu chưa có:
  - Users
  - Topics
  - MCQ_Questions
  - Matching_Pairs
  - Logs
  - Template_UserProgress
- ✅ Tự động set headers với format đẹp
- ✅ Freeze header rows

---

## 🚀 Cách sử dụng

### **Không cần chạy initializeDatabase() nữa!**

Bây giờ hệ thống **tự động** tạo database khi:

1. Lần đầu có user đăng ký/đăng nhập
2. Hoặc bất kỳ function nào gọi `getOrCreateDatabase()`

### **Test ngay:**

1. **Deploy lại web app** (nếu chưa):

   - Mở Apps Script Editor
   - Deploy → New deployment
   - Execute as: **User accessing the web app**
   - Deploy

2. **Test Google Sign-In**:

   - Mở web app
   - Click "Đăng nhập với Google"
   - Authorize (lần đầu)
   - ✅ Tự động tạo database và sheets
   - ✅ Login thành công!

3. **Test đăng ký thường**:
   - Click "Đăng ký ngay"
   - Điền form đăng ký
   - ✅ Tự động tạo database nếu chưa có
   - ✅ Đăng ký thành công!

---

## 📊 Cấu trúc Database tự động tạo

```
DB_Master (Spreadsheet)
├── Users (Sheet)
│   └── Headers: userId, username, email, passwordHash, fullName, role, createdAt, lastLogin, isActive
├── Topics (Sheet)
│   └── Headers: topicId, title, description, category
├── MCQ_Questions (Sheet)
│   └── Headers: questionId, topicId, questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation, difficulty, hint, points
├── Matching_Pairs (Sheet)
│   └── Headers: pairId, topicId, leftItem, rightItem, itemType, difficulty, hints
├── Logs (Sheet)
│   └── Headers: logId, timestamp, level, category, userId, action, details, ipAddress, userAgent, sessionId
└── Template_UserProgress (Sheet)
    └── Headers: progressId, topicId, activityType, completedAt, score, timeSpent, attempts, isCompleted
```

---

## 🎯 Logic hoạt động

### **getOrCreateDatabase() - Smart Version**

```javascript
1. Tìm file "DB_Master" trên Google Drive
   ├─ Có → Mở file
   └─ Không → Tạo mới

2. Kiểm tra sheet "Users"
   ├─ Có → Return spreadsheet
   └─ Không → Tự động khởi tạo:
       ├─ Xóa "Sheet1" mặc định
       ├─ Tạo sheet "Users" với headers
       ├─ Tạo 5 sheets khác
       ├─ Format headers (bold, màu xanh)
       ├─ Freeze header rows
       └─ Return spreadsheet
```

### **Khi nào database được tạo?**

- ✅ User đăng ký lần đầu → Gọi `registerUser()` → `getOrCreateDatabase()` → Tự động tạo
- ✅ User đăng nhập Google → Gọi `handleGoogleAuth()` → `getOrCreateDatabase()` → Tự động tạo
- ✅ User đăng nhập thường → Gọi `loginUser()` → `getOrCreateDatabase()` → Tự động tạo

---

## 🔍 Debug & Verification

### **Check database đã tạo chưa:**

1. Mở Google Drive: https://drive.google.com
2. Tìm file "DB_Master"
3. Mở file → Kiểm tra có 6 sheets:
   - Users ✅
   - Topics ✅
   - MCQ_Questions ✅
   - Matching_Pairs ✅
   - Logs ✅
   - Template_UserProgress ✅

### **Check logs:**

Apps Script Editor → View → Executions → Xem logs:

```
Found existing database: [ID]
hoặc
Created new database: [ID]
Users sheet not found. Initializing database...
Created sheet: Topics
Created sheet: MCQ_Questions
Created sheet: Matching_Pairs
Created sheet: Logs
Created sheet: Template_UserProgress
Database initialized successfully!
```

---

## ✅ So sánh Before/After

### **Before (Cũ - ❌)**

1. User đăng ký → Lỗi "Sheet not found"
2. Phải mở Apps Script Editor
3. Chạy `initializeDatabase()` thủ công
4. Cấp quyền
5. Đợi tạo xong
6. Mới test được

### **After (Mới - ✅)**

1. User đăng ký → **Tự động tạo database**
2. Đăng ký thành công ngay
3. Không cần làm gì thêm!

---

## 🎉 Tóm tắt

**Đã sửa:**

- ✅ Code push lên Apps Script (35 files)
- ✅ `getOrCreateDatabase()` thông minh hơn
- ✅ Tự động tạo database + sheets khi cần

**Cần làm:**

- [ ] Deploy lại web app với `executeAs: USER_ACCESSING`
- [ ] Test đăng nhập Google
- [ ] Test đăng ký thường
- [ ] Verify database đã tạo

**Kết quả:**

- 🎯 Không cần chạy `initializeDatabase()` thủ công nữa
- 🎯 User experience mượt mà hơn
- 🎯 Database tự động setup lần đầu

---

**Test ngay bây giờ!** Mở web app và thử đăng nhập/đăng ký, mọi thứ sẽ tự động tạo! 🚀
