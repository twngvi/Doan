# 🔧 Fix Lỗi Google Login - "Không tìm thấy sheet: Sheet"

## 📋 Tóm tắt các lỗi đã sửa

### **Lỗi 1: Xử lý sheet mặc định không đúng**

**File:** `server/utils.gs` - Hàm `getOrCreateDatabase()`

**Vấn đề:**

- Khi rename sheet mặc định thành "Users", có thể gặp lỗi
- Không có fallback tốt khi rename fails
- `startsWith()` không hoạt động trong Apps Script cũ

**Đã sửa:**

```javascript
// Thay đổi từ:
sheetName.startsWith("Sheet");

// Thành:
sheetName.indexOf("Sheet") === 0;

// Thêm try-catch cho việc xóa sheet:
try {
  usersSheet = ss.insertSheet("Users");
  ss.deleteSheet(defaultSheet);
  Logger.log("Created new Users sheet and deleted old sheet");
} catch (deleteError) {
  Logger.log("Failed to delete old sheet: " + deleteError.toString());
  usersSheet = ss.getSheetByName("Users");
}
```

---

### **Lỗi 2: Biến không đúng tên**

**File:** `server/users.gs` - Hàm `handleGoogleAuth()`

**Vấn đề:**

- Dùng biến `email` thay vì `userEmail`
- Gây lỗi undefined variable

**Đã sửa:**

```javascript
// Dòng 481: Sửa từ
details: "New user registered with Google account: " + email,

// Thành:
details: "New user registered with Google account: " + userEmail,
```

---

### **Lỗi 3: Thiếu validation database**

**File:** `server/utils.gs` và `server/users.gs`

**Vấn đề:**

- Không kiểm tra xem database spreadsheet có tạo thành công không
- Không có logging đầy đủ

**Đã sửa:**

```javascript
// Thêm validation trong getOrCreateDatabase():
if (!ss) {
  throw new Error("Không thể tạo hoặc mở database spreadsheet");
}

// Thêm final check:
usersSheet = ss.getSheetByName("Users");
if (!usersSheet) {
  throw new Error("Users sheet could not be created or found");
}

// Thêm logging trong handleGoogleAuth():
Logger.log("Getting database...");
const ss = getOrCreateDatabase();

if (!ss) {
  Logger.log("Failed to get database spreadsheet");
  return { status: "error", message: "..." };
}

Logger.log("Database ID: " + ss.getId());
```

---

## 🧪 Cách Test

### **Bước 1: Deploy lại Web App**

1. Mở Google Apps Script Editor
2. Click **Deploy** → **Manage deployments**
3. Click ⚙️ (Edit) bên cạnh deployment hiện tại
4. Click **New version** (tạo version mới)
5. Click **Deploy**

### **Bước 2: Kiểm tra cấu hình**

Đảm bảo trong `appsscript.json`:

```json
{
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_ACCESSING"
  }
}
```

### **Bước 3: Test đăng nhập Google**

#### **Scenario 1: User mới (chưa có tài khoản)**

1. Mở web app
2. Click **"Đăng nhập với Google"**
3. Chọn tài khoản Google
4. **Kỳ vọng:**
   - Tạo tài khoản mới trong `DB_Master` > `Users`
   - Tạo Google Sheet riêng cho user với tên: `[FullName] - Learning Progress ([userId])`
   - Sheet cá nhân có 3 tabs: `My Progress`, `Summary`, `Achievements`
   - Redirect đến trang Dashboard
   - Toast: "Tài khoản mới đã được tạo! Chào mừng [tên]"

#### **Scenario 2: User đã tồn tại**

1. Đăng nhập lại với cùng email Google
2. **Kỳ vọng:**
   - Tìm thấy user trong database
   - Update `lastLogin`
   - Redirect đến Dashboard
   - Toast: "Đăng nhập thành công với Google!"

---

## 📊 Cấu trúc Database sau khi Google Login

### **DB_Master > Users Sheet**

| Column        | Data         | Ví dụ               |
| ------------- | ------------ | ------------------- |
| userId        | USR001       | USR001              |
| username      | email_prefix | johndoe             |
| email         | Google email | johndoe@gmail.com   |
| passwordHash  | GOOGLE_AUTH  | GOOGLE_AUTH         |
| fullName      | Email prefix | johndoe             |
| role          | student      | student             |
| createdAt     | Timestamp    | 20/11/2025 15:30:00 |
| lastLogin     | Timestamp    | 20/11/2025 15:30:00 |
| isActive      | true         | true                |
| spreadsheetId | Sheet ID     | 1abc...xyz          |

### **Personal Progress Sheet**

**Sheet Name:** `John Doe - Learning Progress (USR001)`

**Tab 1: My Progress**
| Date | Topic | Activity Type | Score | Time Spent | Status | Notes |
|------|-------|---------------|-------|------------|--------|-------|
| Welcome! | Your learning journey starts here | - | - | - | Ready | Start learning! |

**Tab 2: Summary**

- Total Activities: 0
- Average Score: 0
- Total Time Spent: 0
- Favorite Topic: -

**Tab 3: Achievements**
| Badge | Achievement | Date Earned |
|-------|-------------|-------------|
| 🏆 | - | - |

---

## 🔍 Debug Tips

### **Nếu vẫn gặp lỗi:**

#### **1. Kiểm tra Logs**

```javascript
// Trong Apps Script Editor
View → Logs (hoặc Ctrl+Enter)
```

**Logs quan trọng:**

- `=== GOOGLE AUTH START ===`
- `Google email: [email]`
- `Getting database...`
- `Database ID: [id]`
- `Users sheet found successfully`

#### **2. Test function trực tiếp**

Trong Apps Script Editor, chạy:

```javascript
function testGoogleAuth() {
  const result = handleGoogleAuth();
  Logger.log("Result: " + JSON.stringify(result));
}
```

#### **3. Kiểm tra Database**

```javascript
function checkDatabase() {
  const ss = getOrCreateDatabase();
  Logger.log("Spreadsheet ID: " + ss.getId());
  Logger.log("Spreadsheet URL: " + ss.getUrl());

  const sheets = ss.getSheets();
  Logger.log("Total sheets: " + sheets.length);

  sheets.forEach((sheet) => {
    Logger.log("- Sheet: " + sheet.getName());
  });
}
```

#### **4. Xóa và tạo lại Database**

Nếu database bị corrupt:

```javascript
function resetDatabase() {
  // Xóa DB_Master cũ
  const files = DriveApp.getFilesByName("DB_Master");
  while (files.hasNext()) {
    files.next().setTrashed(true);
  }

  // Tạo mới
  const result = initializeDatabase();
  Logger.log("New database created: " + result.message);
}
```

---

## ✅ Checklist Verification

- [ ] Code đã push lên Apps Script thành công (`clasp push`)
- [ ] Deploy version mới của Web App
- [ ] Test đăng nhập với tài khoản Google mới
- [ ] Kiểm tra `DB_Master` có user mới
- [ ] Kiểm tra có Personal Sheet được tạo
- [ ] Test đăng nhập lại với cùng tài khoản
- [ ] Kiểm tra `lastLogin` được update
- [ ] Redirect đến Dashboard thành công
- [ ] Toast notifications hiển thị đúng

---

## 📝 Notes

### **Về executeAs: USER_ACCESSING**

- Cần thiết để lấy Google email của user
- User phải grant permissions cho app
- Mỗi user có quyền riêng trên Personal Sheet của mình

### **Về Personal Progress Sheet**

- Mỗi user có 1 Google Sheet riêng
- Sheet ID được lưu trong `DB_Master` > `Users` > `spreadsheetId`
- Sheet này dùng để tracking:
  - Lịch sử chơi game
  - Điểm số, thời gian
  - Achievements
  - Progress summary

### **Về Auto-create Account**

- Nếu email chưa tồn tại → tạo mới
- Nếu đã tồn tại → login
- Không cần password cho Google users
- `passwordHash` = "GOOGLE_AUTH"

---

## 🚀 Next Steps

Sau khi fix lỗi này, bạn có thể:

1. **Thêm thông tin user từ Google Profile:**

   ```javascript
   // Lấy full name thật từ Google
   const userProfile = Session.getActiveUser();
   const fullName = userProfile.getEmail(); // Cần API thêm để lấy full name
   ```

2. **Thêm avatar từ Google:**

   ```javascript
   // Lưu Google avatar URL
   const avatarUrl = "https://...";
   ```

3. **Sync data giữa sessions:**

   - Lưu session token
   - Implement auto-login
   - Remember user preference

4. **Security enhancements:**
   - Implement session timeout
   - Add CSRF protection
   - Validate permissions

---

## 📞 Support

Nếu vẫn gặp vấn đề:

1. Check console logs trong browser (F12)
2. Check Apps Script logs
3. Verify webapp deployment settings
4. Test với tài khoản Google khác
5. Clear browser cache và localStorage
