# Hướng dẫn Cài đặt Hiển thị Google Doc lên Trang Lesson

## 📋 Tổng quan
Hệ thống đã được code đầy đủ để hiển thị nội dung bài học từ Google Doc. Bạn chỉ cần thực hiện các bước cài đặt sau.

---

## ⚙️ Bước 1: Cài đặt Drive API trong Apps Script

### 1.1. Mở Apps Script Editor
1. Mở project Apps Script của bạn
2. URL: `https://script.google.com`

### 1.2. Thêm Drive API Service
1. Ở thanh bên trái, tìm mục **Services** (biểu tượng dấu +)
2. Nhấn vào dấu **+** bên cạnh "Services"
3. Trong danh sách dịch vụ, tìm và chọn **Google Drive API**
4. Chọn **Version**: `v3` (latest)
5. Nhấn nút **Add**

![Drive API Setup](https://developers.google.com/static/apps-script/images/services-add.png)

✅ **Xác nhận**: Bạn sẽ thấy "Drive" xuất hiện trong danh sách Services với biểu tượng ổ đĩa.

---

## 📝 Bước 2: Chuẩn bị Google Doc nguồn

### 2.1. Tạo hoặc mở Google Doc chứa nội dung bài học
- Mở file Google Doc tại: https://docs.google.com

### 2.2. Lấy ID của Google Doc
1. Mở Google Doc bài học
2. Nhìn vào thanh địa chỉ URL:
   ```
   https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                    ^^^^^^^^^^^^^^^^^^^^^^^^
                                    ĐÂY LÀ DOC ID
   ```
3. Sao chép chuỗi ký tự giữa `/d/` và `/edit` - đây chính là **Doc ID**

### 2.3. Cài đặt quyền chia sẻ
**Quan trọng**: Để Apps Script có thể đọc được nội dung, bạn cần:

1. Nhấn nút **Share** (Chia sẻ) trên Google Doc
2. Chọn một trong hai cách:

**Cách 1: Chia sẻ công khai (Khuyến nghị - Đơn giản nhất)**
- Nhấn **Change to anyone with the link**
- Chọn quyền: **Viewer** (Người xem)
- ✅ Xong! Mọi người có link đều xem được

**Cách 2: Chia sẻ riêng tư**
- Thêm email cụ thể của người dùng
- Hoặc chia sẻ cho domain (@yourdomain.com)

> 💡 **Lưu ý**: Nếu Web App chạy ở chế độ "Execute as: Me", chỉ cần bạn (chủ script) có quyền đọc Doc là đủ.

---

## 🗄️ Bước 3: Thêm Doc ID vào Database

### 3.1. Mở file `database/masterDb.js`
Tìm đến phần định nghĩa topics.

### 3.2. Thêm `contentDocId` vào topic
```javascript
const TOPICS = [
  {
    id: "topic-1",
    title: "Giới thiệu về E-Commerce",
    description: "Tìm hiểu về thương mại điện tử",
    contentDocId: "1AbCdEfGhIjKlMnOpQrStUvWxYz", // ← THÊM DOC ID VÀO ĐÂY
    icon: "🛒",
    color: "blue"
  },
  // ... các topics khác
];
```

### 3.3. Lưu và Deploy lại
```bash
clasp push
```

---

## 🔧 Bước 4: Kiểm tra Code (Đã có sẵn)

Các file sau đã được code đầy đủ, bạn không cần chỉnh sửa:

### ✅ `server/content.js`
Chứa hàm `getTopicContentByDocId(docId)`:
- Gọi Drive API để export Doc sang HTML
- Xử lý lỗi 403, 404, 401
- Làm sạch CSS và format HTML
- Trả về nội dung cho client

### ✅ `views/Lesson/lesson_content.html`
- Có vùng `<div id="lesson-content-area">` để hiển thị nội dung
- Loading state, error state
- Progress bar để theo dõi tiến độ đọc

### ✅ `views/Lesson/lesson_scripts.html`
- Hàm `loadLessonContent(docId)` gọi server
- Xử lý response và inject HTML vào trang
- Có retry mechanism khi lỗi

### ✅ `views/Lesson/lesson_styles.html`
- CSS đẹp cho heading, paragraph, image, table
- Responsive và dễ đọc

---

## 🚀 Bước 5: Deploy Web App

### 5.1. Nhấn Deploy
1. Trong Apps Script Editor, nhấn nút **Deploy** > **New deployment**
2. Chọn loại: **Web app**

### 5.2. Cấu hình Deploy
```
Type: Web app
Description: Lesson from Google Doc
Execute as: Me (owner)              ← Quan trọng
Who has access: Anyone with a Google account
```

**Giải thích:**
- **Execute as Me**: Web app sẽ dùng quyền của bạn để đọc Doc → Người dùng không cần quyền truy cập Doc gốc
- **Who has access**: Chọn đối tượng được phép sử dụng web app

### 5.3. Cấp quyền lần đầu
1. Nhấn **Authorize access**
2. Chọn tài khoản Google của bạn
3. Nhấn **Advanced** > **Go to [Project name] (unsafe)**
4. Nhấn **Allow**

✅ Lấy **Web app URL** và lưu lại.

---

## 🧪 Bước 6: Test chức năng

### 6.1. Mở Web App
1. Truy cập Web app URL
2. Đăng nhập vào hệ thống

### 6.2. Vào trang Topics
1. Chọn một topic có `contentDocId`
2. Nhấn vào topic để vào trang Lesson

### 6.3. Kiểm tra
✅ Nội dung Google Doc hiển thị đầy đủ
✅ Hình ảnh, bảng, định dạng hiển thị đúng
✅ Không có lỗi trong Console (F12)

### 6.4. Console Logs để Debug
Mở **Developer Tools** (F12) > **Console**, bạn sẽ thấy:
```
📚 Initializing Lesson Page...
📄 Loading lesson content from Doc ID: 1AbCdEf...
✅ google.script.run available
🚀 Calling getTopicContentByDocId...
✅ Lesson content response: {success: true, content: "..."}
✅ Đã tải bài giảng
```

---

## 🔄 Bước 7: Cập nhật nội dung (Realtime)

### Ưu điểm lớn nhất:
Khi bạn sửa nội dung trong Google Doc:

1. ✏️ Mở Google Doc và chỉnh sửa nội dung
2. 💾 Lưu (Ctrl+S hoặc tự động)
3. 🔄 Tải lại trang Lesson (F5)
4. ✅ Nội dung mới hiển thị ngay lập tức

**KHÔNG CẦN** deploy lại Apps Script!

---

## ❌ Xử lý lỗi thường gặp

### Lỗi 403: Permission Denied
**Nguyên nhân**: Script không có quyền đọc Google Doc

**Giải pháp**:
1. Mở Google Doc
2. Nhấn **Share** > **Anyone with the link** > **Viewer**
3. Hoặc chia sẻ trực tiếp cho email chủ script

### Lỗi 404: File not found
**Nguyên nhân**: Doc ID sai hoặc file đã bị xóa

**Giải pháp**:
1. Kiểm tra lại Doc ID trong URL
2. Đảm bảo file chưa bị xóa
3. Cập nhật lại `contentDocId` trong `masterDb.js`

### Lỗi: google.script.run not available
**Nguyên nhân**: Chạy file HTML trực tiếp thay vì qua Web App

**Giải pháp**:
- Luôn truy cập qua Web App URL (không mở file HTML local)

### Nội dung không hiển thị
**Debug steps**:
1. Mở Console (F12)
2. Kiểm tra log: `Response.success`, `Response.content`
3. Nếu `success: false`, xem `Response.message`
4. Kiểm tra Drive API đã được enable chưa

---

## 📊 Cấu trúc dữ liệu

### Topic với contentDocId
```javascript
{
  id: "topic-1",
  title: "Tên bài học",
  contentDocId: "1AbCdEfGhIjKlMnOpQrStUvWxYz", // Google Doc ID
  // ... các trường khác
}
```

### Response từ server
```javascript
{
  success: true,
  content: "<div class='lesson-content-wrapper'>...</div>",
  message: "Đã tải nội dung bài học"
}
```

---

## 💡 Tips & Best Practices

### 1. Tổ chức Google Docs
- Tạo một folder riêng cho tất cả Doc bài học
- Đặt tên file rõ ràng: "Topic 1 - Giới thiệu E-Commerce"
- Dùng Template để đồng nhất format

### 2. Tối ưu hiển thị
- Dùng Heading 1, 2, 3 trong Google Doc
- Thêm ảnh có kích thước hợp lý (không quá to)
- Dùng bảng để trình bày dữ liệu

### 3. Performance
- Nội dung Doc không nên quá dài (> 50 trang)
- Nếu bài dài, chia thành nhiều topics nhỏ
- Ảnh nên optimize trước khi paste vào Doc

### 4. Bảo mật
- Không share Doc với quyền "Editor" cho public
- Chỉ dùng "Viewer" permission
- Nếu nội dung nhạy cảm, dùng "Specific people"

---

## ✅ Checklist hoàn thành

- [ ] Đã enable Drive API trong Apps Script Services
- [ ] Đã tạo Google Doc và lấy Doc ID
- [ ] Đã share Google Doc với quyền phù hợp
- [ ] Đã thêm `contentDocId` vào topic trong `masterDb.js`
- [ ] Đã deploy Web App với "Execute as: Me"
- [ ] Đã test và thấy nội dung hiển thị đúng
- [ ] Đã test cập nhật Doc và reload trang

---

## 🎯 Kết luận

Chức năng hiển thị Google Doc lên trang Lesson đã được **code sẵn hoàn chỉnh**. Bạn chỉ cần:

1. ✅ Enable Drive API (1 lần duy nhất)
2. ✅ Thêm Doc ID vào database
3. ✅ Share Google Doc
4. ✅ Deploy Web App

Sau đó mọi thay đổi nội dung chỉ cần sửa trong Google Doc và reload trang!

---

**Tài liệu tham khảo:**
- [Google Drive API - Export](https://developers.google.com/drive/api/v3/manage-downloads#export_a_document)
- [Apps Script Services](https://developers.google.com/apps-script/guides/services)
- [Web Apps Deployment](https://developers.google.com/apps-script/guides/web)
