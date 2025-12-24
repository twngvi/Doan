# 🔧 DEBUG: Null Response Issue

## ❌ Vấn đề hiện tại

Cả **Mindmap** và **Flashcards** đều trả về `null`:

```
Mindmap response: null
Flashcards response: null
```

## 🔍 Nguyên nhân có thể

### 1. **Chưa setup API Key** ⭐ QUAN TRỌNG NHẤT

- Gemini API Key chưa được cấu hình
- Hàm `GeminiService.getApiKey()` trả về `null`
- → AI không thể generate content

### 2. **Lỗi trong quá trình generate**

- Document không đọc được
- AI API trả về lỗi
- Parse JSON thất bại

### 3. **Cache trống và không thể generate mới**

- Không có cache
- Không có API Key → không generate được

## ✅ Giải pháp từng bước

### **BƯỚC 1: Kiểm tra API Key (QUAN TRỌNG!)**

#### Cách 1: Qua Menu (KHUYẾN NGHỊ)

1. Mở file **Google Sheet MASTER_DB**
2. Đợi menu **🛠️ Admin Tools** xuất hiện
3. Click **Admin Tools → 🔍 View API Key Status**

**Nếu hiển thị "⚠️ Chưa có API Key":**

- Click **Admin Tools → 🔑 Setup API Key**
- Nhập API Key lấy từ: https://makersuite.google.com/app/apikey
- Click OK
- Hệ thống sẽ tự test connection

#### Cách 2: Qua Apps Script Editor

1. Mở https://script.google.com
2. Tìm project của bạn
3. Chọn function: `ADMIN_viewApiKeyStatus`
4. Click Run
5. Xem kết quả trong Logs

---

### **BƯỚC 2: Xem Apps Script Logs**

1. Mở **Apps Script Editor**: https://script.google.com
2. Chọn project của bạn
3. Click menu **View → Logs** (hoặc Ctrl+Enter)
4. Hoặc click menu **View → Executions**

**Tìm lỗi gần nhất** với timestamp khớp với lúc bạn click tab Mindmap/Flashcards:

```
❌ Các lỗi thường gặp:

"API Key chưa được setup"
→ Chưa có API Key
→ Giải pháp: Setup API Key

"Cannot read Google Doc"
→ Không có quyền truy cập Doc
→ Giải pháp: Chia sẻ Doc hoặc kiểm tra Doc ID

"AI generation failed"
→ Gemini API lỗi
→ Giải pháp: Kiểm tra API Key, quota

"Parse error"
→ AI trả về JSON không hợp lệ
→ Giải pháp: Thử regenerate
```

---

### **BƯỚC 3: Test kết nối API**

**Qua Menu:**

1. Mở Google Sheet
2. Click **Admin Tools → ✅ Test API Connection**
3. Xem kết quả

**Kết quả mong đợi:**

```
✅ Kết nối thành công!
Gemini API kết nối thành công!
```

**Nếu lỗi:**

```
❌ Kết nối thất bại
API Key chưa được setup...
```

→ Quay lại BƯỚC 1

---

### **BƯỚC 4: Test quyền truy cập Document**

1. Lấy **Doc ID** từ bảng Topics trong Sheet
2. Click **Admin Tools → 📄 Test Document Access**
3. Nhập Doc ID
4. Xem kết quả

**Kết quả mong đợi:**

```
✅ Truy cập thành công!
Tên file: [Tên file của bạn]
Chủ sở hữu: [Email]
```

**Nếu lỗi:**

```
❌ Không thể truy cập!
→ Chia sẻ Doc với "Anyone with link can view"
```

---

### **BƯỚC 5: Clear Cache và thử lại**

1. Click **Admin Tools → 🗑️ Clear Cache**
2. Confirm "Yes"
3. Reload web app
4. Click lại tab Mindmap hoặc Flashcards

---

### **BƯỚC 6: Xem Console Logs chi tiết**

Code đã được cập nhật để log chi tiết hơn:

1. Mở web app
2. Nhấn **F12** để mở DevTools
3. Chọn tab **Console**
4. Click tab Mindmap hoặc Flashcards
5. Xem logs:

```javascript
✅ Mindmap response: null
Response type: object  // Hoặc "null"
Response is null? true  // ← Đây là vấn đề
Response.success: undefined
Response.data: undefined
Response.message: undefined

❌ Response is NULL - Server error occurred
```

**Nếu thấy "Response is NULL":**
→ Lỗi ở server-side
→ Xem Apps Script Logs (BƯỚC 2)

---

## 📝 Checklist Debug

- [ ] **1. Kiểm tra API Key**
  - [ ] Mở Sheet → Admin Tools → View API Key Status
  - [ ] Nếu chưa có → Setup API Key
- [ ] **2. Test API Connection**
  - [ ] Admin Tools → Test API Connection
  - [ ] Kết quả: ✅ hoặc ❌?
- [ ] **3. Kiểm tra Doc ID**
  - [ ] Mở Sheet → Sheet "Topics"
  - [ ] Tìm topic đang test
  - [ ] Cột `contentDocId` có giá trị?
- [ ] **4. Test Document Access**
  - [ ] Admin Tools → Test Document Access
  - [ ] Nhập Doc ID từ bảng Topics
  - [ ] Kết quả: ✅ hoặc ❌?
- [ ] **5. Xem Apps Script Logs**
  - [ ] Mở script.google.com
  - [ ] View → Executions
  - [ ] Tìm lỗi gần nhất
- [ ] **6. Clear Cache**
  - [ ] Admin Tools → Clear Cache
  - [ ] Reload web app
  - [ ] Thử lại

---

## 🎯 Kịch bản khắc phục theo lỗi

### **Lỗi: "API Key chưa được setup"**

```bash
Giải pháp:
1. Lấy API Key tại: https://makersuite.google.com/app/apikey
2. Admin Tools → Setup API Key
3. Nhập API Key
4. Test connection
```

### **Lỗi: "Cannot read Google Doc"**

```bash
Giải pháp:
1. Mở Google Doc
2. Click "Share"
3. Chọn "Anyone with link can view"
4. Copy link và lấy Doc ID
5. Paste vào bảng Topics
```

### **Lỗi: "AI generation failed"**

```bash
Giải pháp:
1. Kiểm tra API Key còn quota không
2. Thử đổi sang model khác
3. Kiểm tra nội dung Doc có quá dài không
4. Thử lại sau 1 phút
```

---

## 🔬 Debug Script (Chạy trong Apps Script Editor)

Thêm function này vào Code.js để debug:

```javascript
function DEBUG_testGetAIContent() {
  const topicId = "TOPIC001"; // Thay bằng topic ID thực
  const contentType = "mindmap";

  Logger.log("=== DEBUG TEST ===");

  // Test 1: Kiểm tra API Key
  const apiKey = GeminiService.getApiKey();
  Logger.log("API Key exists: " + (apiKey ? "YES" : "NO"));
  if (apiKey) {
    Logger.log("API Key (masked): " + apiKey.substring(0, 8) + "...");
  }

  // Test 2: Gọi getAIContent
  const result = getAIContent(topicId, contentType, false);
  Logger.log("Result: " + JSON.stringify(result, null, 2));

  // Test 3: Kiểm tra từng bước
  Logger.log("Result.success: " + result.success);
  Logger.log("Result.message: " + result.message);
  Logger.log("Result.data type: " + typeof result.data);

  return result;
}
```

**Cách chạy:**

1. Copy code trên vào Code.js
2. Chọn function `DEBUG_testGetAIContent`
3. Click Run
4. Xem Logs

---

## 💡 Tips

1. **Luôn kiểm tra API Key trước tiên** - Đây là nguyên nhân phổ biến nhất
2. **Xem Logs ngay sau khi test** - Logs sẽ chỉ ra lỗi chính xác
3. **Test từng bước** - Đừng test nhiều thứ cùng lúc
4. **Clear cache khi thay đổi** - Để đảm bảo không dùng cache cũ

---

## 🆘 Vẫn không được?

**Gửi cho tôi thông tin sau:**

1. **Screenshot Apps Script Logs** (View → Executions)
2. **Screenshot Console Logs** (F12 trong browser)
3. **Kết quả các test:**
   - View API Key Status → ✅/❌?
   - Test API Connection → ✅/❌?
   - Test Document Access → ✅/❌?
4. **Doc ID** đang dùng test
5. **Topic ID** đang dùng test

---

**Bắt đầu từ BƯỚC 1 ngay!** 🚀
