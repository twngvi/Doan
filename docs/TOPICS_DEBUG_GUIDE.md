# 🔍 Hướng Dẫn Debug Topics Page

## ✅ Những gì đã được sửa

### 1. **Cập nhật server/topics.js**

- ✅ Thêm logging chi tiết hơn
- ✅ Thêm error stack trace
- ✅ Kiểm tra danh sách sheets có sẵn
- ✅ Thêm các trường `totalStages`, `minAILevel`, `minAccuracy` cho frontend
- ✅ Xử lý trường hợp sheet rỗng

### 2. **Cập nhật topics_scripts.html**

- ✅ Thêm console.log chi tiết để debug
- ✅ Cải thiện error handling
- ✅ Hiển thị thông tin chi tiết về lỗi

### 3. **Cấu hình đã được xác nhận**

- ✅ Spreadsheet ID: `1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds`
- ✅ Sheet Name: `Topics` (có chữ 's')
- ✅ Code đã push lên Apps Script

---

## 🧪 Các Bước Kiểm Tra (Theo Thứ Tự)

### **Bước 1: Kiểm Tra Apps Script Console**

1. Mở Apps Script Editor:

   ```
   https://script.google.com/home/projects/1DagFwWEV-FW4mC137RrcRgXeal2fC-n5JOfaIOaVDN3du_n3H_m5p7I1/edit
   ```

2. Chạy hàm test:

   - Chọn function: `testGetAllTopics`
   - Nhấn **Run** (▶️)
   - Xem kết quả trong **Execution Log**

3. **Phân tích kết quả:**

   ✅ **Nếu log hiển thị:**

   ```json
   {
     "success": true,
     "topics": [{...}],
     "count": 10
   }
   ```

   → **Backend hoạt động tốt**, chuyển sang Bước 2

   ❌ **Nếu log hiển thị:**

   ```
   Topics sheet not found
   Available sheets: Users, MCQ_Questions, ...
   ```

   → **Tên sheet sai hoặc không tồn tại**, xem Bước Fix #1

   ❌ **Nếu log hiển thị:**

   ```
   Exception: You do not have permission...
   ```

   → **Chưa cấp quyền**, xem Bước Fix #2

---

### **Bước 2: Kiểm Tra Browser Console**

1. Mở Web App (URL đã deploy)
2. Mở **DevTools** (F12)
3. Chuyển sang tab **Console**
4. Navigate đến Topics page
5. **Xem log output:**

   ✅ **Nếu thấy:**

   ```
   ✅ Successfully loaded 10 topics
   Topics loaded - Raw result: {success: true, topics: Array(10)}
   ```

   → **Thành công!** Topics đã load

   ❌ **Nếu thấy:**

   ```
   ❌ Result is null or undefined
   ```

   → **Vấn đề kết nối**, xem Bước Fix #3

   ❌ **Nếu thấy:**

   ```
   ❌ Request failed: Topics sheet not found...
   ```

   → **Vấn đề database**, quay lại Bước 1

---

### **Bước 3: Kiểm Tra Google Sheet**

1. Mở spreadsheet:

   ```
   https://docs.google.com/spreadsheets/d/1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds/edit
   ```

2. Kiểm tra:

   - ✅ Có tab tên **"Topics"** (chính xác, có chữ 's')
   - ✅ Có ít nhất 2 dòng (1 header + 1 data row)
   - ✅ Cột A (topicId) không trống

3. **Cấu trúc cột mong đợi:**
   ```
   A: topicId
   B: title
   C: description
   D: category
   E: order
   F: iconUrl
   G: estimatedTime
   H: prerequisiteTopics
   I: isLocked
   J: unlockCondition
   K: createdBy
   L: createdAt
   ```

---

## 🔧 Các Cách Khắc Phục

### **Fix #1: Sheet Name Không Đúng**

**Nguyên nhân:** Tab trong Google Sheet có tên khác "Topics"

**Cách khắc phục:**

1. Mở Google Sheet
2. Nhấp chuột phải vào tab → **Rename**
3. Đổi thành chính xác: `Topics` (có chữ 's', viết hoa T)
4. Refresh web app

**HOẶC** sửa code nếu tên tab khác:

```javascript
// Trong server/topics.js, dòng ~18
const sheet = db.getSheetByName("Topics"); // Đổi thành tên tab thực tế
```

---

### **Fix #2: Chưa Cấp Quyền Truy Cập**

**Nguyên nhân:** Apps Script chưa được phép đọc Google Sheet

**Cách khắc phục:**

1. Trong Apps Script Editor, chạy bất kỳ function nào
2. Popup xuất hiện → Nhấn **Review Permissions**
3. Chọn tài khoản Google
4. Nhấn **Advanced** → **Go to [Project Name] (unsafe)**
5. Nhấn **Allow**
6. Chạy lại `testGetAllTopics`

---

### **Fix #3: Client Không Nhận Được Data**

**Nguyên nhân:** Google Apps Script caching hoặc deployment issue

**Cách khắc phục:**

1. **Re-deploy Web App:**

   ```powershell
   cd "e:\New folder\Doan"
   clasp push
   clasp deploy
   ```

2. **Hoặc deploy qua UI:**

   - Apps Script Editor → **Deploy** → **Test deployments**
   - Copy URL mới
   - Mở URL trong **Incognito mode**

3. **Clear cache:**
   - DevTools (F12) → **Network** tab
   - Tick ☑️ **Disable cache**
   - Hard refresh: `Ctrl + Shift + R`

---

### **Fix #4: Data Rỗng Nhưng Sheet Có Dữ Liệu**

**Nguyên nhân:** Cột topicId (cột A) có giá trị rỗng

**Cách khắc phục:**

Trong Google Sheet, kiểm tra:

- Cột A phải có giá trị (ví dụ: `TOP001`, `TOP002`)
- Không có dòng trống ở giữa data
- Không có ô merged (gộp ô)

---

## 📊 Mẫu Dữ Liệu Chuẩn

Nếu sheet của bạn chưa có data, copy mẫu này vào:

| topicId | title                  | description                        | category     | order | iconUrl | estimatedTime | prerequisiteTopics | isLocked | unlockCondition | createdBy | createdAt  |
| ------- | ---------------------- | ---------------------------------- | ------------ | ----- | ------- | ------------- | ------------------ | -------- | --------------- | --------- | ---------- |
| TOP001  | Variables & Data Types | Học về biến và kiểu dữ liệu cơ bản | Fundamental  | 1     | 📊      | 30 min        |                    | FALSE    |                 | SYSTEM    | 2024-01-01 |
| TOP002  | Control Flow           | Câu lệnh điều kiện và vòng lặp     | Control Flow | 2     | 🔄      | 45 min        | TOP001             | FALSE    |                 | SYSTEM    | 2024-01-01 |
| TOP003  | Functions              | Khai báo và sử dụng hàm            | Fundamental  | 3     | ⚡      | 40 min        | TOP001             | FALSE    |                 | SYSTEM    | 2024-01-01 |

---

## 🎯 Expected Behavior (Sau Khi Sửa Xong)

### **Trong Browser Console:**

```
🚀 Topics page scripts loading...
Loading topics from database...
Topics loaded - Raw result: {success: true, topics: Array(10), count: 10}
Result type: object
Result is null: false
Result is undefined: false
Result.success: true
Result.topics: (10) [{…}, {…}, ...]
✅ Successfully loaded 10 topics
```

### **Trên UI:**

- Loading spinner biến mất
- Topic cards hiển thị
- Filter buttons hoạt động
- Search box hoạt động

---

## 🆘 Vẫn Chưa Được?

Nếu sau tất cả các bước trên vẫn không được, hãy cung cấp:

1. **Screenshot Execution Log** từ Apps Script (khi chạy `testGetAllTopics`)
2. **Screenshot Browser Console** (khi load Topics page)
3. **Screenshot Google Sheet** (tab Topics)
4. **Web App URL** hiện tại đang dùng

---

## 📝 Command Cheat Sheet

```powershell
# Push code lên Apps Script
cd "e:\New folder\Doan"
clasp push

# Xem version hiện tại
clasp versions

# Deploy version mới
clasp deploy

# Mở Apps Script Editor
clasp open
```

---

**Last Updated:** December 8, 2025
**Status:** ✅ Code đã được sửa và push lên Apps Script
