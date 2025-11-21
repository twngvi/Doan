# ⚠️ Fix Google Login - Quick Guide

## 🔴 Vấn Đề

**Triệu chứng:** Nhấn "Đăng nhập với Google" → KHÔNG có popup chọn tài khoản

---

## ✅ Giải Pháp 3 Bước

### **Bước 1: Lấy Client ID** (5 phút)

1. Vào: https://console.cloud.google.com/apis/credentials
2. **CREATE CREDENTIALS** > **OAuth client ID** > **Web application**
3. **Authorized JavaScript origins:** `https://script.google.com`
4. **CREATE** → Copy Client ID (dạng: `xxxxx.apps.googleusercontent.com`)

### **Bước 2: Update Code** (1 phút)

File: `views/client_js.html` ~ dòng 102

```javascript
// ❌ CŨ
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// ✅ MỚI - Paste Client ID vừa copy
const GOOGLE_CLIENT_ID = "123456789-abcdef.apps.googleusercontent.com";
```

### **Bước 3: Deploy & Test** (2 phút)

```powershell
clasp push
```

Test:
1. Mở app **chế độ Incognito** (Ctrl+Shift+N)
2. Click "Đăng nhập với Google"
3. ✅ Popup Account Chooser xuất hiện

---

## 🔧 Nếu Vẫn Lỗi

### Lỗi: "Access blocked"
→ Vào: https://console.cloud.google.com/apis/credentials/consent  
→ Thêm email vào **Test users**

### Lỗi: "Invalid client"
→ Kiểm tra Client ID đã đúng format chưa

### Lỗi: "Prompt not displayed"
→ Mở **chế độ Incognito** hoặc đăng xuất Google

---

## 📚 Chi Tiết

- **Hướng dẫn đầy đủ:** `GOOGLE_SIGNIN_SETUP.md`
- **Phân tích lỗi:** `BUG_REPORT_GOOGLE_SIGNIN.md`

---

*Updated: 2025-11-21*
