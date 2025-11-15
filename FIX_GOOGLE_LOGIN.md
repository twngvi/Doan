# 🔧 Fix Google Login Issue

## ❌ Vấn đề

**Error**: "Could not get Google account email. Please ensure the app has proper permissions."

**Nguyên nhân**: Web app đang chạy với `executeAs: "USER_DEPLOYING"` (quyền của người deploy) thay vì `executeAs: "USER_ACCESSING"` (quyền của người đang truy cập).

---

## ✅ Đã sửa

### 1. **Cập nhật `appsscript.json`**

**Before:**

```json
"webapp": {
  "access": "ANYONE",
  "executeAs": "USER_DEPLOYING"
}
```

**After:**

```json
"webapp": {
  "access": "ANYONE",
  "executeAs": "USER_ACCESSING"  // ← THAY ĐỔI NÀY
}
```

### 2. **Cải thiện `handleGoogleAuth()` trong `server/users.gs`**

Thêm fallback để lấy email:

```javascript
let userEmail = Session.getActiveUser().getEmail();

// Fallback: Try effective user
if (!userEmail) {
  userEmail = Session.getEffectiveUser().getEmail();
}
```

---

## 🚀 Cách Deploy Lại

### **QUAN TRỌNG**: Phải deploy version MỚI, không dùng deployment cũ!

### **Bước 1: Mở Apps Script Editor**

```
https://script.google.com/home/projects/1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5
```

### **Bước 2: Deploy New Version**

1. Click **Deploy** → **New deployment**
2. Chọn type: **Web app**
3. Điền thông tin:
   - **Description**: `Fix Google Login - USER_ACCESSING`
   - **Execute as**: `User accessing the web app` ✅ (Đây là điểm quan trọng!)
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. Copy **Web app URL** mới

### **Bước 3: Cấp quyền lại**

Khi mở URL lần đầu:

1. Hệ thống sẽ yêu cầu authorize lại
2. Click **Review Permissions**
3. Chọn tài khoản Google của bạn
4. Click **Advanced** → **Go to Doanv3 (unsafe)**
5. Click **Allow**

---

## 🎯 Test Lại

### **Test Google Sign-In**

1. Mở web app URL mới
2. Click **"Đăng nhập với Google"**
3. Chọn tài khoản Google
4. Lần đầu: Cấp quyền khi được hỏi
5. ✅ Phải login thành công và hiển thị email

### **Check Console**

Mở F12 → Console, phải thấy:

```
Google login initiated
Google auth response: {"status":"success",...,"userEmail":"your@gmail.com"}
```

### **Check Backend Logs**

Apps Script Editor → View → Executions, phải thấy:

```
=== GOOGLE AUTH ===
Google email: your@gmail.com
```

---

## 📊 Sự khác biệt giữa USER_DEPLOYING vs USER_ACCESSING

### **USER_DEPLOYING** (Cũ - ❌ Không hoạt động cho Google Login)

- Script chạy với quyền của người deploy web app
- `Session.getActiveUser().getEmail()` trả về email của người deploy
- Tất cả users đều dùng chung quyền của người deploy
- **Không thể** lấy email của user đang truy cập

### **USER_ACCESSING** (Mới - ✅ Hoạt động)

- Script chạy với quyền của user đang truy cập
- `Session.getActiveUser().getEmail()` trả về email của user hiện tại
- Mỗi user cần authorize riêng lần đầu
- **Có thể** lấy email của user để đăng nhập Google

---

## 🔐 Bảo mật

### **USER_ACCESSING an toàn hơn cho Google Login vì:**

1. ✅ Mỗi user tự authorize với tài khoản của họ
2. ✅ Script chỉ có quyền của user đó, không có quyền admin
3. ✅ User có thể revoke quyền bất kỳ lúc nào
4. ✅ Email được lấy trực tiếp từ Google OAuth

### **Lưu ý:**

- User cần authorize lần đầu tiên truy cập
- Nếu user revoke permissions, cần authorize lại
- Script chạy chậm hơn một chút (do check permissions)

---

## ⚠️ Nếu vẫn lỗi

### **Lỗi 1: "Authorization required"**

**Fix**: User cần click vào link authorize và cấp quyền

### **Lỗi 2: "Script has insufficient permissions"**

**Fix**:

1. Xóa deployment cũ
2. Tạo deployment mới với **Execute as: User accessing the web app**

### **Lỗi 3: "Email still empty"**

**Fix**:

1. Check `appsscript.json` có `"executeAs": "USER_ACCESSING"`
2. Deploy lại (tạo version mới)
3. Clear browser cache
4. Test với incognito mode

---

## 📝 Checklist

- [x] ✅ Sửa `appsscript.json` → `executeAs: "USER_ACCESSING"`
- [x] ✅ Cải thiện `handleGoogleAuth()` với fallback
- [x] ✅ Push code lên Apps Script
- [ ] ⏳ **Deploy new version** (QUAN TRỌNG!)
- [ ] ⏳ Test Google Sign-In
- [ ] ⏳ Verify email hiển thị đúng

---

## 🎉 Kết quả mong đợi

Sau khi deploy đúng:

- ✅ Click "Đăng nhập với Google" → Authorize → Login thành công
- ✅ Console hiển thị email của user
- ✅ User mới được tạo tự động
- ✅ User cũ login được ngay

---

## 📞 Support

Nếu sau khi deploy đúng cách mà vẫn lỗi:

1. Check console logs (F12)
2. Check Apps Script execution logs
3. Verify deployment settings: **Execute as = User accessing the web app**
4. Try với tài khoản Google khác

---

**TÓM TẮT**:

1. Code đã được sửa ✅
2. **PHẢI DEPLOY LẠI với "Execute as: User accessing"** ⚠️
3. Authorize lại lần đầu
4. Test thôi! 🚀
