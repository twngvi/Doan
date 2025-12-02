# 🔧 Fix: Email Verification Issue

## ❌ Vấn đề

Khi click vào link xác nhận trong email, hệ thống hiển thị `TRUE` nhưng message là **"Token không tồn tại hoặc đã được sử dụng"**.

## 🔍 Nguyên nhân

Schema mới (MASTER_DB) đã loại bỏ các columns:

- `passwordHash`
- `emailVerified`
- `verificationToken`
- `verificationExpires`

Nhưng code trong `authService.js` vẫn tìm kiếm các columns này, dẫn đến `indexOf()` trả về `-1` và không thể tìm thấy token.

## ✅ Giải pháp đã thực hiện

### 1. Cập nhật Schema (config/schema.js)

Đã thêm lại các columns vào `USERS` sheet:

```javascript
columns: [
  "userId",
  "username",
  "email",
  "passwordHash", // ✅ Thêm lại
  "googleId",
  "avatarUrl",
  "role",
  "level",
  "totalXP",
  "mountainStage",
  "mountainProgress",
  "aiLevel",
  "progressSheetId",
  "emailVerified", // ✅ Thêm lại
  "verificationToken", // ✅ Thêm lại
  "verificationExpires", // ✅ Thêm lại
  "createdAt",
  "lastLogin",
  "isActive",
];
```

### 2. Cập nhật User Registration (server/users.gs)

```javascript
const newUser = [
  userId,
  username,
  email,
  passwordHash, // ✅ Hash password
  googleId,
  avatarUrl,
  role,
  level,
  totalXP,
  mountainStage,
  mountainProgress,
  aiLevel,
  progressSheetId,
  false, // ✅ emailVerified
  "", // ✅ verificationToken
  "", // ✅ verificationExpires
  createdAt,
  lastLogin,
  isActive,
];
```

### 3. Cập nhật Auth Service (services/authService.js)

Đã thêm các helper functions:

- ✅ `generateVerificationToken()` - Tạo token ngẫu nhiên
- ✅ `hashPasswordSecure()` - Hash password với SHA-256
- ✅ `sendVerificationEmail()` - Gửi email xác thực
- ✅ `isValidEmail()` - Validate email format

### 4. Cập nhật Registration Flow

```javascript
const newUser = [
  userId,
  username,
  userData.email,
  passwordHash, // ✅ Hash password
  "", // googleId
  "", // avatarUrl
  "student", // role
  1, // level
  0, // totalXP
  1, // mountainStage
  0, // mountainProgress
  1, // aiLevel
  "", // progressSheetId
  false, // ✅ emailVerified = false
  verificationToken, // ✅ Token được tạo
  verificationExpires, // ✅ Expires sau 24h
  now, // createdAt
  "", // lastLogin
  false, // isActive (chờ verify)
];
```

---

## 🚀 Các bước tiếp theo

### Bước 1: Cập nhật MASTER_DB Sheet

Bạn cần chạy function để cập nhật schema của MASTER_DB hiện tại:

```javascript
function updateUsersSheet() {
  const ss = getOrCreateDatabase();
  const usersSheet = ss.getSheetByName("Users");

  // Lấy headers hiện tại
  const lastCol = usersSheet.getLastColumn();
  const currentHeaders = usersSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  Logger.log("Current headers: " + currentHeaders.join(", "));

  // Headers mới theo schema
  const newHeaders = [
    "userId",
    "username",
    "email",
    "passwordHash",
    "googleId",
    "avatarUrl",
    "role",
    "level",
    "totalXP",
    "mountainStage",
    "mountainProgress",
    "aiLevel",
    "progressSheetId",
    "emailVerified",
    "verificationToken",
    "verificationExpires",
    "createdAt",
    "lastLogin",
    "isActive",
  ];

  // Cập nhật headers
  usersSheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

  // Format header
  usersSheet
    .getRange(1, 1, 1, newHeaders.length)
    .setFontWeight("bold")
    .setBackground("#4285f4")
    .setFontColor("white");

  Logger.log("✅ Users sheet updated with new schema");
}
```

**Chạy function này trong Apps Script Editor:**

1. Mở Google Apps Script Editor
2. Paste function `updateUsersSheet()` vào `Code.js`
3. Chạy function
4. Grant permissions nếu được yêu cầu

### Bước 2: Migrate dữ liệu users hiện có (nếu có)

Nếu đã có users trong database cũ:

```javascript
function migrateExistingUsers() {
  const ss = getOrCreateDatabase();
  const usersSheet = ss.getSheetByName("Users");
  const data = usersSheet.getDataRange().getValues();

  if (data.length <= 1) {
    Logger.log("No users to migrate");
    return;
  }

  const headers = data[0];

  // Thêm default values cho columns mới
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Thêm passwordHash nếu chưa có (empty)
    if (row.length < 4 || !row[3]) {
      usersSheet.getRange(i + 1, 4).setValue("");
    }

    // Thêm emailVerified = false
    if (row.length < 14) {
      usersSheet.getRange(i + 1, 14).setValue(false);
    }

    // Thêm verificationToken = empty
    if (row.length < 15) {
      usersSheet.getRange(i + 1, 15).setValue("");
    }

    // Thêm verificationExpires = empty
    if (row.length < 16) {
      usersSheet.getRange(i + 1, 16).setValue("");
    }
  }

  Logger.log("✅ Migrated " + (data.length - 1) + " users");
}
```

### Bước 3: Test Email Verification

1. **Đăng ký user mới:**

   - Vào trang đăng ký
   - Nhập email, password
   - Submit form

2. **Kiểm tra email:**

   - Check inbox (và Spam folder)
   - Tìm email từ "Doanv3 System"
   - Click vào link verification

3. **Verify thành công:**

   - Trang sẽ hiển thị: "Xác thực email thành công! Bạn có thể đăng nhập ngay."
   - Status: `success: true`

4. **Kiểm tra database:**
   - Mở MASTER_DB
   - Vào Users sheet
   - Kiểm tra user vừa tạo:
     - `emailVerified` = TRUE
     - `isActive` = TRUE
     - `verificationToken` = (empty)

---

## 🐛 Troubleshooting

### Issue 1: "Headers không khớp"

**Giải pháp:** Chạy `updateUsersSheet()` để cập nhật schema

### Issue 2: "Không nhận được email"

**Kiểm tra:**

- Email quota: `MailApp.getRemainingDailyQuota()` > 0
- Gmail permissions được grant
- Check Spam folder
- Verify `sendVerificationEmail()` logs

### Issue 3: "Token vẫn không tìm thấy"

**Debug:**

```javascript
// Trong verifyEmail function, thêm logs:
Logger.log("Looking for token: " + token);
Logger.log("tokenIndex: " + tokenIndex);
Logger.log("All tokens in sheet:");
for (let i = 1; i < data.length; i++) {
  Logger.log("Row " + i + ": " + data[i][tokenIndex]);
}
```

### Issue 4: "Link verification không hoạt động"

**Kiểm tra:**

- Web app đã được deploy chưa
- URL format đúng: `?page=verify&token=XXX`
- Handler cho page=verify đã được implement chưa

---

## 📝 Code đã push

Tất cả thay đổi đã được push lên Google Apps Script:

```
✔ Pushed 21 files
└─ config\schema.js          ✅ Updated
└─ server\users.gs           ✅ Updated
└─ services\authService.js   ✅ Updated
└─ docs\DATABASE_STRUCTURE.md ✅ Updated
```

---

## ✅ Checklist

- [x] Cập nhật schema.js với columns mới
- [x] Cập nhật users.gs registration
- [x] Cập nhật authService.js
- [x] Thêm helper functions
- [x] Push code lên Apps Script
- [ ] Chạy `updateUsersSheet()` trong Apps Script Editor
- [ ] Migrate users hiện có (nếu có)
- [ ] Test đăng ký + verification
- [ ] Verify email hoạt động
- [ ] Update documentation

---

## 📞 Next Steps

1. **Chạy `updateUsersSheet()`** để cập nhật schema
2. **Test registration flow** với email thật
3. **Verify email verification** hoạt động đúng
4. **Deploy web app** nếu chưa deploy
5. **Monitor logs** trong Apps Script Executions

---

**✅ Fix đã hoàn tất! Email verification sẽ hoạt động sau khi bạn chạy `updateUsersSheet()`**
