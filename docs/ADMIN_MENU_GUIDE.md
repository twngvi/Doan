# 📖 Hướng dẫn sử dụng Admin Menu

## ✅ Đã cập nhật thành công

### 1. **Hàm `renderMindmap()` - Hỗ trợ đa dạng cấu trúc**

✅ **Cập nhật:**

- Hỗ trợ cả `data.branches` và `data.nodes`
- Hỗ trợ cả `node.label` và `node.name`
- Xử lý `children` dạng string hoặc object
- Thêm màu sắc và icon động

✅ **Các cấu trúc được hỗ trợ:**

```javascript
// Cấu trúc 1: branches + label
{
  "branches": [
    { "label": "...", "icon": "📚", "color": "#4285f4", "children": [...] }
  ]
}

// Cấu trúc 2: nodes + name
{
  "nodes": [
    { "name": "...", "icon": "📚", "color": "#4285f4", "children": [...] }
  ]
}
```

---

### 2. **Hàm `renderCurrentFlashcard()` - Xử lý cấu trúc lồng nhau**

✅ **Cập nhật:**

- Xử lý `card.front` dạng object: `{ content: "...", hint: "..." }`
- Xử lý `card.back` dạng object: `{ content: "...", example: "..." }`
- Fallback về string nếu không phải object
- Logging chi tiết để debug

✅ **Các cấu trúc được hỗ trợ:**

```javascript
// Cấu trúc 1: Lồng nhau (phức tạp)
{
  "front": { "content": "Câu hỏi?", "hint": "Gợi ý" },
  "back": { "content": "Đáp án", "example": "Ví dụ" }
}

// Cấu trúc 2: Đơn giản
{
  "term": "Thuật ngữ",
  "definition": "Định nghĩa"
}

// Cấu trúc 3: String trực tiếp
{
  "front": "Câu hỏi?",
  "back": "Đáp án"
}
```

---

### 3. **Admin Menu trong Google Sheet** 🎉

✅ **Menu được tạo tự động khi mở file:**

Khi bạn mở file **MASTER_DB** (Google Sheet), menu **🛠️ Admin Tools** sẽ tự động xuất hiện với các tùy chọn:

```
🛠️ Admin Tools
  ├─ 🔑 Setup API Key
  ├─ ────────────────
  ├─ ✅ Test API Connection
  ├─ 📄 Test Document Access
  ├─ 🔍 View API Key Status
  ├─ ────────────────
  ├─ 📊 View All Topics
  └─ 🗑️ Clear Cache
```

---

## 🚀 Cách sử dụng Admin Menu

### **Bước 1: Mở Google Sheet MASTER_DB**

1. Mở file Google Sheet của project
2. Đợi vài giây để menu tải
3. Menu **🛠️ Admin Tools** sẽ xuất hiện bên cạnh **Help**

### **Bước 2: Setup API Key (Chỉ chạy 1 lần)**

1. Click menu: **Admin Tools → Setup API Key**
2. Nhập Gemini API Key (lấy tại: https://makersuite.google.com/app/apikey)
3. Hệ thống sẽ tự động test kết nối
4. Thông báo thành công ✅

### **Bước 3: Test các chức năng**

#### **✅ Test API Connection**

- Click menu: **Admin Tools → Test API Connection**
- Kiểm tra Gemini API có hoạt động không
- Hiển thị kết quả và thông tin model

#### **📄 Test Document Access**

- Click menu: **Admin Tools → Test Document Access**
- Nhập Google Doc ID để kiểm tra quyền truy cập
- Hiển thị tên file và chủ sở hữu nếu thành công

#### **🔍 View API Key Status**

- Xem trạng thái API Key hiện tại (đã masked để bảo mật)
- Kiểm tra xem đã setup chưa

#### **📊 View All Topics**

- Xem danh sách tất cả topics trong hệ thống
- Hiển thị ID và Doc ID của từng topic

#### **🗑️ Clear Cache**

- Xóa tất cả cache AI đã tạo
- Force regenerate nội dung mới
- **Cảnh báo:** Tốn token AI khi tạo lại

---

## ❌ Giải quyết lỗi Permission

### **Lỗi: "Cannot call SpreadsheetApp.getUi() from this context"**

**Nguyên nhân:**

- Bạn đang chạy hàm trực tiếp từ Apps Script Editor
- Các hàm có `SpreadsheetApp.getUi()` chỉ chạy được từ Sheet

**✅ Giải pháp:**

1. **KHÔNG** chạy từ Apps Script Editor
2. Mở file **Google Sheet** thay vì Editor
3. Sử dụng menu **Admin Tools** để chạy các hàm
4. Hoặc tạo Button/Drawing trong Sheet để gọi hàm

---

## 🔧 Debugging Tips

### **1. Kiểm tra Mindmap không hiển thị**

```javascript
// Mở Console (F12) trong browser
// Kiểm tra log:
console.log("🧠 Rendering mindmap with data:", data);

// Nếu data.branches undefined:
// → AI đang trả về "nodes"
// → Code đã được fix để hỗ trợ cả 2

// Nếu node.name undefined:
// → AI đang trả về "label"
// → Code đã được fix để hỗ trợ cả 2
```

### **2. Kiểm tra Flashcard không hiển thị**

```javascript
// Mở Console (F12) trong browser
// Kiểm tra log:
console.log("🃏 Rendering flashcard:", card);

// Nếu card.front.content undefined:
// → Kiểm tra cấu trúc data
// → Code đã hỗ trợ nhiều cấu trúc

// Nếu vẫn lỗi, xem structure thực tế:
console.log("Card structure:", JSON.stringify(card, null, 2));
```

### **3. Xem Logs trong Apps Script**

1. Mở Apps Script Editor
2. Click menu: **View → Logs** (hoặc Ctrl+Enter)
3. Xem các log từ `Logger.log()`
4. Tìm lỗi bằng filter

---

## 📝 Checklist sau khi cập nhật

- [x] Push code lên Apps Script: `clasp push`
- [x] Mở Google Sheet MASTER_DB
- [x] Kiểm tra menu **Admin Tools** có xuất hiện
- [x] Setup API Key qua menu
- [x] Test API Connection
- [x] Test Document Access với 1 Doc ID thực
- [x] Vào web app và test Mindmap tab
- [x] Test Flashcards tab
- [x] Kiểm tra Console không có lỗi

---

## 🎯 Kết quả mong đợi

✅ **Menu hoạt động:**

- Menu xuất hiện khi mở Sheet
- Tất cả các mục menu có thể click
- Không có lỗi `Cannot call getUi()`

✅ **Mindmap hiển thị:**

- Hiển thị đúng cây phân cấp
- Có màu sắc và icon
- Hỗ trợ cả `branches` và `nodes`

✅ **Flashcards hiển thị:**

- Hiển thị term và definition đúng
- Có thể flip card
- Hỗ trợ cả structure lồng nhau và đơn giản

✅ **Permission:**

- Không còn lỗi `getUi()`
- Có thể test Doc access
- Có thể setup API Key từ UI

---

## 🆘 Cần hỗ trợ thêm?

Nếu vẫn gặp vấn đề:

1. Kiểm tra Console log trong browser (F12)
2. Kiểm tra Apps Script Logs
3. Chụp ảnh lỗi và cấu trúc data
4. Gửi kèm thông tin:
   - Lỗi gì?
   - Đang ở tab nào?
   - Data structure như thế nào?

---

**Chúc bạn thành công! 🎉**
