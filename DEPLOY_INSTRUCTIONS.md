# 🚀 HƯỚNG DẪN DEPLOY - QUAN TRỌNG!

## ⚠️ BẮT BUỘC: DEPLOY LẠI WEB APP

Code đã được sửa và push lên Apps Script (vừa xong!). **BẠN PHẢI DEPLOY VERSION MỚI** để sửa lỗi!

### 🔧 Đã sửa:

1. ✅ Lỗi "Không tìm thấy sheet: Sheet" - Fixed database initialization
2. ✅ Lỗi "Thiếu quyền Drive" - Thêm `https://www.googleapis.com/auth/drive` scope
3. ✅ Google Login - Cấu hình `executeAs: USER_ACCESSING`

---

## 📋 Các bước thực hiện (Chi tiết)

### **Bước 1: Mở Apps Script Editor**

Truy cập: https://script.google.com/home/projects/1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5

### **Bước 2: Kiểm tra Code đã cập nhật**

1. Click vào file `server/utils.gs`
2. Tìm function `getOrCreateDatabase()`
3. Xác nhận dòng code mới:
   ```javascript
   const defaultSheet = ss.getSheetByName("Sheet1");
   if (defaultSheet) {
     usersSheet = defaultSheet;
     usersSheet.setName("Users");
   } else {
     usersSheet = ss.insertSheet("Users");
   }
   ```

### **Bước 3: XÓA Deployment Cũ (Nếu có)**

1. Click **Deploy** → **Manage deployments**
2. Tìm deployment hiện tại
3. Click icon **Archive** (nút xóa)
4. Confirm xóa

**Lý do**: Deployment cũ đang dùng `executeAs: USER_DEPLOYING`, cần xóa để tạo mới với `USER_ACCESSING`

### **Bước 4: Tạo NEW Deployment**

1. Click **Deploy** → **New deployment**

2. Click icon **⚙️ Settings** bên cạnh "Select type"

3. Chọn **Web app**

4. Điền thông tin:

   **Description**: `v2 - Fix Google Login + Auto Database`

   **Execute as**: `User accessing the web app` ✅ ← **QUAN TRỌNG!**

   _(Chú ý: KHÔNG chọn "Me" - đó là USER_DEPLOYING)_

   **Who has access**: `Anyone`

5. Click **Deploy**

6. Click **Authorize access**

7. Chọn tài khoản Google của bạn

8. Click **Advanced** → **Go to Doanv3 (unsafe)**

9. Click **Allow**

   **Quyền được yêu cầu:**

   - ✅ View and manage your spreadsheets
   - ✅ See, edit, create, and delete all your Google Drive files
   - ✅ View your email address

10. **COPY URL MỚI** - Đây là URL mới, khác với URL cũ!

---

## 🎯 Test Ngay

### **Test 1: Đăng ký thông thường**

1. Mở **URL MỚI** vừa copy
2. Click **"Đăng ký ngay"**
3. Điền form:
   - Họ tên: `Test User`
   - Tên đăng nhập: `testuser`
   - Email: `test@example.com`
   - Mật khẩu: `123456`
   - Xác nhận: `123456`
4. Click **Đăng ký**
5. ✅ Phải thấy: "Đăng ký thành công!"
6. ✅ Tự động chuyển đến dashboard

### **Test 2: Đăng nhập Google**

1. Quay lại trang login (refresh hoặc logout)
2. Click **"Đăng nhập với Google"**
3. Chọn tài khoản Google
4. **Lần đầu**: Cấp quyền khi được hỏi
   - Click **Allow** để cho phép truy cập:
     - Xem và quản lý spreadsheets
     - Xem địa chỉ email
     - Tạo và quản lý files
5. ✅ Phải thấy:
   - "Tài khoản mới đã được tạo!" (nếu email chưa có)
   - Hoặc "Đăng nhập thành công!" (nếu email đã tồn tại)
6. ✅ Tự động chuyển đến dashboard

---

## 🔍 Verify Database Đã Tạo

### **Check Google Drive:**

1. Mở: https://drive.google.com
2. Tìm file **"DB_Master"**
3. Mở file → Kiểm tra có các sheets:
   - ✅ Users
   - ✅ Topics
   - ✅ MCQ_Questions
   - ✅ Matching_Pairs
   - ✅ Logs
   - ✅ Template_UserProgress
4. Mở sheet **Users** → Xem có dòng user vừa tạo

### **Check Backend Logs:**

1. Apps Script Editor → View → **Executions**
2. Click vào execution mới nhất
3. Xem logs:
   ```
   === GOOGLE AUTH ===
   Google email: your@gmail.com
   Created new database: [ID]
   Renamed Sheet1 to Users
   Created sheet: Topics
   Created sheet: MCQ_Questions
   ...
   Database initialized successfully!
   ```

---

## ❌ Nếu vẫn gặp lỗi

### **Lỗi 1: "Could not get Google account email"**

**Nguyên nhân**: Chưa deploy đúng với `USER_ACCESSING`

**Fix**:

1. Xóa tất cả deployments cũ
2. Tạo deployment MỚI
3. **PHẢI chọn**: "Execute as: User accessing the web app"
4. Test lại

### **Lỗi 2: "Không tìm thấy sheet: Sheet"**

**Nguyên nhân**: Code chưa cập nhật hoặc dùng URL deployment cũ

**Fix**:

1. Verify code đã push (check `server/utils.gs`)
2. Xóa deployment cũ
3. Tạo deployment MỚI
4. Dùng **URL MỚI**, không dùng URL cũ

### **Lỗi 3: "Authorization required"**

**Nguyên nhân**: Chưa cấp quyền

**Fix**:

1. Click link authorize trong error message
2. Chọn tài khoản Google
3. Click "Advanced" → "Go to Doanv3 (unsafe)"
4. Click "Allow"
5. Test lại

### **Lỗi 4: Web app không load**

**Nguyên nhân**: Dùng URL deployment cũ

**Fix**:

1. Copy lại URL từ deployment MỚI
2. Mở URL mới trong incognito/private window
3. Test lại

---

## 📊 So sánh Deployment Cũ vs Mới

### **Deployment Cũ (❌ Không hoạt động):**

```
Execute as: Me (your@gmail.com)
→ USER_DEPLOYING
→ Không lấy được email của user
→ Lỗi "Could not get Google account email"
```

### **Deployment Mới (✅ Hoạt động):**

```
Execute as: User accessing the web app
→ USER_ACCESSING
→ Lấy được email của từng user
→ Google Login hoạt động!
```

---

## 🎉 Kết quả mong đợi

Sau khi deploy đúng cách:

### **Đăng ký thông thường:**

- ✅ Tự động tạo database nếu chưa có
- ✅ Tự động tạo tất cả 6 sheets
- ✅ Thêm user vào sheet Users
- ✅ Tạo Progress sheet cho user
- ✅ Auto login và chuyển đến dashboard

### **Đăng nhập Google:**

- ✅ Lấy email từ Google account
- ✅ Tự động tạo database nếu chưa có
- ✅ Nếu email chưa có: Tạo user mới
- ✅ Nếu email đã có: Login ngay
- ✅ Chuyển đến dashboard

---

## 📝 Checklist Hoàn Chỉnh

- [ ] ✅ Code đã push (35 files)
- [ ] ⏳ **Xóa deployment cũ**
- [ ] ⏳ **Tạo deployment MỚI với USER_ACCESSING**
- [ ] ⏳ **Authorize với tài khoản Google**
- [ ] ⏳ **Copy URL mới**
- [ ] ⏳ Test đăng ký thông thường
- [ ] ⏳ Test đăng nhập Google
- [ ] ⏳ Verify database đã tạo trong Google Drive
- [ ] ⏳ Check user data trong sheet Users

---

## 🆘 Cần trợ giúp?

Nếu sau khi làm đúng tất cả các bước mà vẫn lỗi:

1. **Screenshot lỗi** trong console (F12)
2. **Copy logs** từ Apps Script Executions
3. **Verify deployment settings**:
   - Execute as = "User accessing the web app" ✅
   - NOT "Me (your@gmail.com)" ❌
4. **Verify đang dùng URL mới**, không phải URL cũ

---

## 🎯 TÓM TẮT NHANH

1. **Mở**: https://script.google.com/home/projects/1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5
2. **Deploy** → New deployment
3. **Execute as**: User accessing the web app ✅
4. **Deploy** → Copy URL
5. **Test** với URL mới
6. **Done!** 🎉

---

**LƯU Ý QUAN TRỌNG**:

- ❌ KHÔNG dùng URL deployment cũ
- ✅ PHẢI dùng URL deployment MỚI
- ✅ PHẢI chọn "User accessing the web app"
- ✅ PHẢI authorize lần đầu

Good luck! 🚀
