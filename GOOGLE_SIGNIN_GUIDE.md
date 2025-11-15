# 🔐 Hướng dẫn Đăng nhập Google - Doanv3

## ✅ Đã hoàn thành

### 1. **Sửa lỗi hiện tại**

- ✅ Thêm logging chi tiết hơn trong client code
- ✅ Hiển thị đầy đủ thông tin lỗi trong console

### 2. **Tính năng Google Sign-In**

- ✅ Thêm nút "Đăng nhập với Google" vào trang login
- ✅ Thêm nút "Đăng ký với Google" vào trang register
- ✅ Tạo backend function `handleGoogleAuth()` để xử lý authentication
- ✅ Tự động tạo tài khoản mới nếu email chưa tồn tại
- ✅ Tự động đăng nhập nếu email đã có trong hệ thống
- ✅ Cập nhật OAuth scopes trong appsscript.json

---

## 🚀 Cách sử dụng

### **Đăng nhập bằng Google**

1. Mở web app: https://script.google.com/macros/s/YOUR_WEB_APP_URL/exec
2. Trên trang đăng nhập, click nút **"Đăng nhập với Google"**
3. Hệ thống sẽ:
   - Lấy email từ tài khoản Google của bạn
   - Kiểm tra xem email đã có trong database chưa
   - Nếu **đã có**: Đăng nhập ngay
   - Nếu **chưa có**: Tự động tạo tài khoản mới và đăng nhập

### **Đăng ký bằng Google**

1. Trên trang đăng ký, click nút **"Đăng ký với Google"**
2. Hệ thống sẽ:
   - Lấy email từ tài khoản Google của bạn
   - Tạo tài khoản mới nếu chưa tồn tại
   - Tự động đăng nhập và chuyển đến dashboard

---

## 🔧 Chi tiết kỹ thuật

### **Backend - `server/users.gs`**

```javascript
function handleGoogleAuth() {
  // Lấy email từ Google account
  const userEmail = Session.getActiveUser().getEmail();

  // Kiểm tra user tồn tại
  // - Nếu có: Return user info (login)
  // - Nếu không: Tạo user mới (signup)

  // Tự động tạo Progress sheet cho user mới
}
```

**Đặc điểm:**

- Password được set là `"GOOGLE_AUTH"` (không dùng password thật)
- Username tự động lấy từ phần trước @ của email
- Full name mặc định là username (có thể cập nhật sau)
- Role mặc định: `student`

### **Frontend - `views/client_js.html`**

```javascript
function handleGoogleLogin() {
  google.script.run
    .withSuccessHandler(onGoogleAuthSuccess)
    .withFailureHandler(onApiError)
    .handleGoogleAuth();
}

function onGoogleAuthSuccess(response) {
  // Lưu user vào localStorage
  // Hiển thị thông báo
  // Chuyển đến dashboard
}
```

### **OAuth Scopes - `appsscript.json`**

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/drive.file"
  ]
}
```

---

## 🎨 Giao diện

### **Nút Google Sign-In**

- Icon Google đầy màu sắc (4 màu: xanh dương, xanh lá, vàng, đỏ)
- Text: "Đăng nhập với Google" / "Đăng ký với Google"
- Style: Border trắng, hover effect
- Vị trí: Dưới nút đăng nhập/đăng ký chính, có divider "Hoặc"

### **Loading State**

- Hiển thị overlay loading khi đang xử lý
- Disable nút để tránh click nhiều lần

---

## 🔍 Debug & Troubleshooting

### **Xem chi tiết lỗi**

Mở **Console** trong browser (F12) để xem:

```
Register response: {...}
Response status: error
Response message: Users sheet not found. Please initialize database first.
```

### **Lỗi thường gặp**

#### 1. **"Users sheet not found"**

**Nguyên nhân**: Database chưa được khởi tạo

**Cách fix**:

1. Mở Apps Script Editor: https://script.google.com/home/projects/1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5
2. Chọn file `Code.js`
3. Chọn function `initializeDatabase` từ dropdown
4. Click nút **Run**
5. Cấp quyền khi được yêu cầu
6. Chờ database được tạo
7. Refresh web app và thử lại

#### 2. **"Could not get Google account email"**

**Nguyên nhân**: Chưa cấp quyền truy cập email

**Cách fix**:

1. Khi click nút Google Sign-In lần đầu
2. Hệ thống sẽ yêu cầu cấp quyền
3. Chọn **Allow** để cho phép truy cập email
4. Thử lại

#### 3. **"Permission denied"**

**Nguyên nhân**: User chưa authorize app

**Cách fix**:

1. Mở Apps Script Editor
2. Run bất kỳ function nào (ví dụ: `initializeDatabase`)
3. Click **Review Permissions**
4. Chọn tài khoản Google
5. Click **Advanced** → **Go to Doanv3 (unsafe)**
6. Click **Allow**
7. Quay lại web app và thử lại

---

## 📊 Logs & Monitoring

### **Backend Logs**

Xem logs trong Apps Script Editor:

- View → Executions
- Hoặc: https://script.google.com/home/executions

Logs hiển thị:

```
=== GOOGLE AUTH ===
Google email: user@gmail.com
Existing user logged in via Google: username
```

Hoặc:

```
New user registered via Google: username
Created user progress sheet: Progress_USR001
```

### **Activity Logs**

Tất cả hoạt động được ghi vào sheet **Logs**:

- Google Login
- Google Signup
- User ID
- Timestamp
- Details

---

## 🔐 Bảo mật

### **Điểm mạnh**

1. ✅ Sử dụng Google OAuth - bảo mật cao
2. ✅ Không lưu password thật cho Google users
3. ✅ Email được verify tự động bởi Google
4. ✅ Session được lưu trong localStorage (client-side)

### **Lưu ý**

- Google Sign-In chỉ hoạt động khi user đã đăng nhập Google account
- Email phải là email của Google account đang active
- Nếu user logout Google, cần login lại

---

## 🎯 Tính năng tiếp theo

### **Có thể thêm:**

1. Lấy avatar từ Google account
2. Lấy full name từ Google profile
3. Sync Google Calendar cho deadline
4. Google Drive integration cho file sharing
5. Google Classroom integration

---

## 📝 Testing Checklist

### **Test Case 1: Đăng ký mới với Google**

- [ ] Click "Đăng ký với Google"
- [ ] Xác nhận email được lấy đúng
- [ ] User mới được tạo trong sheet Users
- [ ] Progress sheet được tạo
- [ ] Auto login thành công
- [ ] Hiển thị dashboard

### **Test Case 2: Đăng nhập với Google (user đã có)**

- [ ] Click "Đăng nhập với Google"
- [ ] Nhận diện user existing
- [ ] Cập nhật lastLogin
- [ ] Login thành công
- [ ] Hiển thị dashboard

### **Test Case 3: Error Handling**

- [ ] Database chưa khởi tạo → Hiển thị lỗi rõ ràng
- [ ] Chưa cấp quyền → Yêu cầu authorize
- [ ] Network error → Hiển thị thông báo lỗi

---

## 🚀 Deploy Checklist

- [x] ✅ Code đã push lên Apps Script (35 files)
- [x] ✅ OAuth scopes đã cập nhật
- [ ] ⏳ Database đã khởi tạo (run `initializeDatabase()`)
- [ ] ⏳ Test đăng nhập Google trên web app
- [ ] ⏳ Test đăng ký Google trên web app
- [ ] ⏳ Verify logs hoạt động đúng

---

## 📞 Support

Nếu gặp vấn đề:

1. Check console logs (F12)
2. Check Apps Script execution logs
3. Verify database đã khởi tạo
4. Kiểm tra OAuth permissions

---

**Tóm tắt**: Code đã được cập nhật với đầy đủ tính năng Google Sign-In. Bạn chỉ cần:

1. Khởi tạo database (nếu chưa)
2. Test trên web app
3. Enjoy! 🎉
