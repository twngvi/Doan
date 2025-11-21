# 🔧 Quick Fix - Lỗi "Không tìm thấy sheet: Sheet"

## ⚠️ Nguyên nhân

File `utils/idGenerator.js` (code cũ) đang conflict với `server/utils.gs` (code mới) trên Apps Script.

Cả 2 file đều có hàm `generateNextId()` nhưng với signature khác nhau:

- `utils/idGenerator.js`: `generateNextId(sheetName, prefix)` - nhận string, gọi `getSheet()`
- `server/utils.gs`: `generateNextId(sheet, prefix)` - nhận sheet object

Apps Script bị confused và gọi nhầm hàm cũ → lỗi vì `getSheet()` không tồn tại.

## ✅ Đã sửa

1. ✅ Rename `utils/idGenerator.js` → `idGenerator.js.backup`
2. ✅ Push code mới (34 files thay vì 35)
3. ⚠️ **QUAN TRỌNG:** Cần xóa file cũ trên Apps Script

## 🔨 Bước tiếp theo (BẮT BUỘC)

### **Cách 1: Xóa file qua Apps Script Editor**

1. Mở Apps Script Editor
2. Trong danh sách files bên trái, tìm và XÓA các files này:

   - ❌ `utils/idGenerator` (hoặc `idGenerator.js`)
   - ❌ `config/schema` (nếu có)
   - ❌ Các files khác trong thư mục `utils/`, `models/`, `config/`, `services/` (trừ trong `server/` và `views/`)

3. **GIỮ LẠI** những files này:

   - ✅ `appsscript.json`
   - ✅ `Code.js`
   - ✅ `triggers.js`
   - ✅ `server/main.gs`
   - ✅ `server/users.gs`
   - ✅ `server/utils.gs`
   - ✅ Tất cả files trong `views/`

4. Nhấn **Ctrl+S** để save

### **Cách 2: Pull và Push lại**

```powershell
# Pull code từ Apps Script về
clasp pull

# Xóa các file không cần thiết
Remove-Item "E:\Doanv3\utils\idGenerator.js" -ErrorAction SilentlyContinue
Remove-Item "E:\Doanv3\config\schema.js" -ErrorAction SilentlyContinue

# Push lại
clasp push
```

### **Cách 3: Tạo mới project (nếu cần thiết)**

Nếu 2 cách trên không work:

```powershell
# Clone project hiện tại
clasp clone 1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5

# Xóa tất cả files trong Apps Script project
# Push chỉ files cần thiết
clasp push
```

## 🧪 Sau khi xóa file, test lại:

1. Deploy version mới của Web App
2. Mở web app
3. Click **"Đăng nhập với Google"**
4. Kiểm tra Console Log trong Apps Script:
   - Phải thấy: `=== GOOGLE AUTH START ===`
   - Phải thấy: `Google email: [your_email]`
   - Phải thấy: `Getting database...`
   - Phải thấy: `Database ID: [id]`
   - **KHÔNG** thấy: `Không tìm thấy sheet: Sheet`

## 📝 Giải thích chi tiết

### Tại sao có file trùng?

Ban đầu project có:

- `utils/idGenerator.js` - Code documentation/reference
- `server/utils.gs` - Code thực tế chạy

Apps Script đọc cả 2 files → Conflict!

### Tại sao không dùng `.claspignore`?

`.claspignore` không hoạt động tốt với subdirectories khi `skipSubdirectories: false`.

### Các file nào CẦN trên Apps Script?

**Backend (Server-side):**

- `server/main.gs` - Entry point, doGet()
- `server/users.gs` - User management, Google Auth
- `server/utils.gs` - Helper functions (generateNextId, hashPassword, getOrCreateDatabase)
- `Code.js` - Database initialization
- `triggers.js` - Auto-ID triggers

**Frontend (Client-side):**

- `views/index.html` - Main HTML
- `views/client_js.html` - Client JavaScript
- `views/styles.html` - CSS styles
- `views/page_*.html` - UI pages

**Config:**

- `appsscript.json` - Apps Script manifest

**KHÔNG CẦN:**

- `utils/idGenerator.js` ❌
- `config/schema.js` ❌
- `models/*.js` ❌
- `services/*.js` ❌
- `utils/responseUtil.js` ❌
- `utils/validationUtil.js` ❌

## 🎯 Kết quả mong đợi

Sau khi xóa files cũ:

- ✅ Google Login hoạt động
- ✅ Tạo user mới trong DB_Master
- ✅ Tạo Personal Sheet cho user
- ✅ Redirect đến Dashboard
- ✅ Không có lỗi "Không tìm thấy sheet"

## 🆘 Nếu vẫn lỗi

1. Check Apps Script Logs:

   ```
   View → Executions
   ```

2. Check Browser Console (F12)

3. Verify các files trên Apps Script Editor chỉ còn:

   - 1 file `Code.js`
   - 1 file `triggers.js`
   - Thư mục `server/` (3 files: main.gs, users.gs, utils.gs)
   - Thư mục `views/` (10 files HTML)
   - 1 file `appsscript.json`

4. Deploy version mới và test lại
