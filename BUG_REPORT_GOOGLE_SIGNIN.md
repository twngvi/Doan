# ❌ PHÂN TÍCH LỖI GOOGLE SIGN-IN

## 🔴 Tóm Tắt Vấn Đề

**Triệu chứng:** Khi nhấn nút "Đăng nhập với Google", app KHÔNG hiển thị popup chọn tài khoản Google.

---

## 🔍 Nguyên Nhân (Root Causes)

### **LỖI 1: Client ID Giả** ❌

**File:** `views/client_js.html` - dòng 102

```javascript
// ❌ SAI
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
```

**Vấn đề:** 
- Đây là placeholder, không phải Client ID thật
- Google không thể xác thực request
- API call bị từ chối

**Giải pháp:** ✅
1. Vào https://console.cloud.google.com/apis/credentials
2. Tạo OAuth 2.0 Client ID
3. Copy Client ID thật và thay vào code

---

### **LỖI 2: Không Trigger Google Prompt** ❌

**File:** `views/client_js.html` - hàm `handleGoogleLogin()` (cũ)

```javascript
// ❌ CODE CŨ - SAI
function handleGoogleLogin() {
  isGoogleAuthInProgress = true;
  showLoading(true);
  
  // Gọi trực tiếp backend - KHÔNG mở Account Chooser
  google.script.run
    .withSuccessHandler(onGoogleAuthSuccess)
    .handleGoogleAuth();  // ❌ Sai cách
}
```

**Vấn đề:**
- Gọi trực tiếp backend function `handleGoogleAuth()`
- Không trigger Google Identity Services API
- Không có popup Account Chooser nào xuất hiện

**Giải pháp:** ✅

```javascript
// ✅ CODE MỚI - ĐÚNG
function handleGoogleLogin() {
  // Trigger Google Prompt API
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed()) {
      showAccountSwitchHelp();  // Hướng dẫn user
    }
  });
}
```

---

### **LỖI 3: Thiếu Cấu Hình UX Mode** ❌

**File:** `views/client_js.html` - hàm `initGoogleSignIn()` (cũ)

```javascript
// ❌ CODE CŨ - THIẾU
google.accounts.id.initialize({
  client_id: "YOUR_GOOGLE_CLIENT_ID",
  callback: handleGoogleCredentialResponse,
  auto_select: false,
  // ❌ Thiếu ux_mode và context
});
```

**Vấn đề:**
- Không chỉ định `ux_mode: 'popup'`
- Không chỉ định `context: 'signin'`
- Google không biết nên hiển thị UI như thế nào

**Giải pháp:** ✅

```javascript
// ✅ CODE MỚI - ĐẦY ĐỦ
google.accounts.id.initialize({
  client_id: GOOGLE_CLIENT_ID,
  callback: handleGoogleCredentialResponse,
  auto_select: false,
  cancel_on_tap_outside: true,
  ux_mode: 'popup',      // ✅ Hiển thị popup
  context: 'signin',      // ✅ Ngữ cảnh đăng nhập
});
```

---

### **LỖI 4: Thiếu OAuth Consent Screen** ❌

**Nơi:** Google Cloud Console

**Vấn đề:**
- Chưa cấu hình OAuth consent screen
- Chưa thêm test users
- App chưa được verify

**Giải pháp:** ✅
1. Vào Google Cloud Console
2. APIs & Services > OAuth consent screen
3. Điền thông tin app
4. Thêm test users (email của bạn)
5. Lưu và publish

---

### **LỖI 5: Authorized Origins Chưa Đúng** ❌

**Nơi:** Google Cloud Console > Credentials

**Vấn đề:**
- Thiếu `https://script.google.com` trong Authorized JavaScript origins
- Google chặn request từ domain không được authorize

**Giải pháp:** ✅
Thêm vào **Authorized JavaScript origins:**
```
https://script.google.com
```

---

## 📋 Checklist Sửa Lỗi

### **A. Google Cloud Console** ☁️

- [ ] 1. Tạo project tại https://console.cloud.google.com/
- [ ] 2. Enable Google Identity Services API
- [ ] 3. Tạo OAuth 2.0 Client ID (Web application)
- [ ] 4. Thêm Authorized JavaScript origins: `https://script.google.com`
- [ ] 5. Cấu hình OAuth consent screen
- [ ] 6. Thêm test users (email của bạn)
- [ ] 7. Copy Client ID (dạng: `xxxxx.apps.googleusercontent.com`)

### **B. Code Changes** 💻

- [x] 8. Sửa `initGoogleSignIn()` - thêm `ux_mode` và `context`
- [x] 9. Sửa `handleGoogleLogin()` - dùng `google.accounts.id.prompt()`
- [x] 10. Thay `YOUR_GOOGLE_CLIENT_ID` bằng Client ID thật
- [x] 11. Thêm error handling cho các trường hợp prompt không hiển thị
- [x] 12. Thêm hàm `renderGoogleButton()` (optional)

### **C. Testing** 🧪

- [ ] 13. Mở app trong chế độ Incognito
- [ ] 14. Click "Đăng nhập với Google"
- [ ] 15. Kiểm tra popup Account Chooser xuất hiện
- [ ] 16. Chọn tài khoản và đăng nhập
- [ ] 17. Kiểm tra có thể đổi tài khoản không
- [ ] 18. Test trên nhiều browsers (Chrome, Firefox, Edge)

---

## 🔧 Files Đã Sửa

### **1. `views/client_js.html`**

**Các thay đổi:**
- ✅ Sửa `initGoogleSignIn()`: Thêm `ux_mode: 'popup'` và `context: 'signin'`
- ✅ Sửa `handleGoogleLogin()`: Dùng `google.accounts.id.prompt()`
- ✅ Thêm `renderGoogleButton()`: Render nút Google chính thức (optional)
- ✅ Thêm error handling khi prompt không hiển thị
- ✅ Thêm comment hướng dẫn lấy Client ID

**Commit message đề xuất:**
```
fix: Google Sign-In không hiển thị Account Chooser

- Sửa initGoogleSignIn() với ux_mode='popup'
- Sửa handleGoogleLogin() dùng google.accounts.id.prompt()
- Thêm error handling cho prompt not displayed
- Thêm hướng dẫn cấu hình Client ID trong comment
```

---

## 📖 Tài Liệu Đã Tạo

### **1. `GOOGLE_SIGNIN_SETUP.md`**
- Hướng dẫn chi tiết từng bước cấu hình Google OAuth
- Screenshot và examples
- Troubleshooting guide

### **2. `BUG_REPORT_GOOGLE_SIGNIN.md`** (file này)
- Phân tích lỗi chi tiết
- Root cause analysis
- Solution với code examples

---

## 🎯 Kết Quả Mong Đợi

**Trước khi sửa:** ❌
- Click "Đăng nhập với Google" → Không có gì xảy ra
- Hoặc gọi backend nhưng không có popup

**Sau khi sửa:** ✅
- Click "Đăng nhập với Google" → Popup Account Chooser xuất hiện
- User chọn tài khoản → Đăng nhập thành công
- Có thể đổi tài khoản dễ dàng

---

## 🚀 Các Bước Tiếp Theo

1. **Lấy Client ID thật:**
   - Làm theo hướng dẫn trong `GOOGLE_SIGNIN_SETUP.md`
   - Copy Client ID vào code

2. **Deploy:**
   ```powershell
   clasp push
   clasp deploy
   ```

3. **Test:**
   - Mở chế độ Incognito
   - Test Google Sign-In
   - Verify Account Chooser hiển thị

4. **Nếu vẫn lỗi:**
   - Xem console logs (F12)
   - Kiểm tra OAuth consent screen
   - Đảm bảo test user đã được thêm

---

## 📞 Support

Nếu vẫn gặp lỗi, kiểm tra:

1. **Console Errors (F12):**
   ```
   Network tab → Filter "accounts.google.com"
   Console tab → Tìm error messages
   ```

2. **Google OAuth Logs:**
   - https://console.cloud.google.com/logs

3. **Common Errors:**
   - `invalid_client`: Client ID sai
   - `redirect_uri_mismatch`: Origin không được authorize
   - `access_denied`: User từ chối quyền

---

*Cập nhật: 2025-11-21*
*Version: 1.0*
