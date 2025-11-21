# 🔐 Hướng Dẫn Cấu Hình Google Sign-In

## ❌ Lỗi Hiện Tại

**Vấn đề:** App không hiển thị Account Chooser khi nhấn "Đăng nhập với Google"

**Nguyên nhân:**
1. ❌ Sử dụng Client ID giả: `"YOUR_GOOGLE_CLIENT_ID"`
2. ❌ Không trigger đúng Google Prompt API
3. ❌ Thiếu cấu hình OAuth 2.0 trên Google Cloud Console

---

## ✅ Giải Pháp - Các Bước Cấu Hình

### **Bước 1: Tạo Google Cloud Project**

1. Truy cập: https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project hiện có
3. Tên project: `Doanv3 Learning System`

---

### **Bước 2: Kích Hoạt Google Identity Services API**

1. Vào **APIs & Services** > **Library**
2. Tìm kiếm: `Google Identity Services API`
3. Click **Enable**

---

### **Bước 3: Tạo OAuth 2.0 Credentials**

1. Vào **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Chọn **Application type**: `Web application`
4. Đặt tên: `Doanv3 Web Client`

5. **Authorized JavaScript origins:**
   ```
   https://script.google.com
   ```

6. **Authorized redirect URIs:** (không bắt buộc cho Google Apps Script)
   ```
   https://script.google.com/macros/s/{YOUR_SCRIPT_ID}/usercallback
   ```

7. Click **CREATE**
8. **Copy Client ID** (dạng: `123456789-abc.apps.googleusercontent.com`)

---

### **Bước 4: Cấu Hình OAuth Consent Screen**

1. Vào **OAuth consent screen**
2. Chọn **User Type**: `External` (hoặc `Internal` nếu trong tổ chức)
3. Điền thông tin:
   - **App name**: `Doanv3`
   - **User support email**: email của bạn
   - **Developer contact**: email của bạn
4. **Scopes**: Thêm các scope cần thiết
   ```
   email
   profile
   openid
   ```
5. **Test users** (nếu app chưa publish): Thêm email test
6. Click **SAVE AND CONTINUE**

---

### **Bước 5: Cập Nhật Client ID Vào Code**

Mở file: `views/client_js.html`

**Tìm dòng:**
```javascript
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
```

**Thay bằng Client ID thật:**
```javascript
const GOOGLE_CLIENT_ID = "123456789-abcdefghijk.apps.googleusercontent.com";
```

---

### **Bước 6: Deploy Lại Google Apps Script**

```powershell
# Trong terminal
clasp push
clasp deploy
```

Hoặc trong Google Apps Script Editor:
1. Click **Deploy** > **New deployment**
2. Chọn type: **Web app**
3. **Execute as**: Me
4. **Who has access**: Anyone
5. Click **Deploy**

---

## 🧪 Test Google Sign-In

### **Test 1: Account Chooser Hiển Thị**

1. Mở app trong **chế độ Incognito** (Ctrl+Shift+N)
2. Click nút "Đăng nhập với Google"
3. ✅ **Kỳ vọng:** Popup Google Account Chooser xuất hiện

### **Test 2: Đổi Tài Khoản**

1. Đăng nhập bằng account A
2. Đăng xuất
3. Click "Đăng nhập với Google" lại
4. ✅ **Kỳ vọng:** Có thể chọn account khác

---

## 🔧 Troubleshooting

### **Lỗi: "Google prompt not displayed"**

**Nguyên nhân:** User đã đăng nhập Google trước đó, browser đã lưu cookies

**Giải pháp:**
1. Mở **chế độ Incognito/Ẩn danh**
2. Hoặc đăng xuất tất cả Google accounts tại: https://accounts.google.com
3. Hoặc xóa cookies của `accounts.google.com`

### **Lỗi: "Invalid client ID"**

**Kiểm tra:**
1. Client ID đã copy đúng chưa?
2. `Authorized JavaScript origins` có `https://script.google.com` chưa?
3. OAuth consent screen đã cấu hình xong chưa?

### **Lỗi: "Access blocked: This app's request is invalid"**

**Nguyên nhân:** OAuth consent screen chưa được phê duyệt

**Giải pháp:**
1. Thêm email test vào **Test users**
2. Hoặc publish app (submit for verification)

---

## 📝 Code Đã Sửa

### **1. Khởi tạo Google Sign-In với đúng cấu hình**

```javascript
google.accounts.id.initialize({
  client_id: GOOGLE_CLIENT_ID,
  callback: handleGoogleCredentialResponse,
  auto_select: false,
  cancel_on_tap_outside: true,
  ux_mode: 'popup',      // ✅ Hiển thị popup
  context: 'signin',      // ✅ Ngữ cảnh đăng nhập
});
```

### **2. Trigger Account Chooser khi click nút**

```javascript
function handleGoogleLogin() {
  // ✅ Sử dụng google.accounts.id.prompt()
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed()) {
      // Xử lý khi không hiển thị được
      showAccountSwitchHelp();
    }
  });
}
```

### **3. Handle Credential Response**

```javascript
function handleGoogleCredentialResponse(response) {
  // Gọi backend với ID token
  google.script.run
    .withSuccessHandler(onGoogleAuthSuccess)
    .withFailureHandler(onApiError)
    .handleGoogleAuthWithToken(response.credential);
}
```

---

## 🎯 Kết Quả Mong Đợi

Sau khi hoàn thành:

✅ Click "Đăng nhập với Google" → Popup Account Chooser xuất hiện  
✅ Có thể chọn nhiều tài khoản Google khác nhau  
✅ Đăng nhập thành công và lưu session  
✅ Có thể đăng xuất và đổi tài khoản  

---

## 📚 Tài Liệu Tham Khảo

- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google Sign-In for Websites](https://developers.google.com/identity/sign-in/web)
- [OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)

---

## ⚠️ Lưu Ý Quan Trọng

1. **Không commit Client ID lên GitHub public repo** (dùng environment variables)
2. **Thêm domain restrictions** để tránh abuse
3. **Review OAuth scopes** - chỉ xin quyền cần thiết
4. **Test với nhiều browsers** (Chrome, Firefox, Edge, Safari)
5. **Mobile responsive**: Test trên điện thoại

---

*Cập nhật lần cuối: 2025-11-21*
