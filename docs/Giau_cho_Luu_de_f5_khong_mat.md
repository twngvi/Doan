# Hướng dẫn thêm trang mới vào hệ thống (có chức năng giữ trang khi F5)

## Tổng quan
Khi bạn tạo một trang mới trong ứng dụng, cần thực hiện **3 bước** để đảm bảo trang hoạt động đầy đủ, bao gồm cả khả năng giữ trang khi người dùng nhấn F5 (refresh).

---

## Bước 1: Thêm trang vào danh sách `pageMap` trong `views/client_js.html`

**File:** `views/client_js.html`

**Vị trí:** Khoảng dòng 60-70 (trong hàm `DOMContentLoaded`)

**Thao tác:** Thêm tên trang mới vào object `pageMap`

```javascript
// ...existing code...
const pageMap = {
  'dashboard': 'page-dashboard',
  'topics': 'page-topics',
  'mcq': 'page-mcq',
  'lesson': 'page-lesson',
  'matching': 'page-matching',
  'profile': 'page-profile',
  'login': 'page-login',
  'register': 'page-register',
  'landing': 'page-landing',
  'verify-email': 'page-verify-email',
  'forgot-password': 'page-forgot-password',
  'trang-moi': 'page-trang-moi'  // ← THÊM TRANG MỚI VÀO ĐÂY
};
// ...existing code...
```

**Quy tắc đặt tên:**
- **Key** (bên trái): Tên ngắn gọn, không dấu, dùng gạch ngang `-` (VD: `'reports'`, `'settings'`)
- **Value** (bên phải): ID của thẻ `<div>`, bắt đầu bằng `page-` (VD: `'page-reports'`, `'page-settings'`)

---

## Bước 2: Phân loại trang (Protected hoặc Public)

**Vị trí:** Ngay dưới `pageMap` (dòng 75-76)

### Nếu trang cần đăng nhập (Protected Page):

```javascript
// ...existing code...
const protectedPages = [
  'dashboard', 
  'topics', 
  'mcq', 
  'lesson', 
  'matching', 
  'profile',
  'trang-moi'  // ← THÊM VÀO ĐÂY nếu cần đăng nhập
];
// ...existing code...
```

### Nếu trang không cần đăng nhập (Auth/Public Page):

```javascript
// ...existing code...
const authPages = [
  'login', 
  'register', 
  'landing', 
  'forgot-password',
  'trang-moi'  // ← THÊM VÀO ĐÂY nếu không cần đăng nhập
];
// ...existing code...
```

**Lưu ý:** Một trang chỉ nên nằm trong 1 trong 2 danh sách (hoặc `protectedPages` hoặc `authPages`)

---

## Bước 3: Tạo container trong `index.html`

**File:** `views/index.html`

**Vị trí:** Trong phần `<body>`, cùng nhóm với các trang khác

**Thao tác:** Thêm thẻ `<div>` chứa nội dung trang

```html
<!-- ...existing code... -->

<!-- Existing pages -->
<div id="page-dashboard" class="page-content" style="display:none;">
    <?!= include('dashboard/page_dashboard'); ?>
</div>

<div id="page-topics" class="page-content" style="display:none;">
    <?!= include('Topics/topics_content'); ?>
</div>

<!-- THÊM TRANG MỚI VÀO ĐÂY -->
<div id="page-trang-moi" class="page-content" style="display:none;">
    <?!= include('ten_thu_muc/ten_file'); ?>
</div>

<!-- ...existing code... -->
```

**Giải thích thuộc tính:**
- `id="page-trang-moi"`: Phải khớp với value trong `pageMap` (Bước 1)
- `class="page-content"`: Class chung để hệ thống ẩn/hiện trang
- `style="display:none;"`: Ẩn trang khi mới load
- `<?!= include('path/file'); ?>`: Nhúng nội dung HTML từ file khác

---

## Bước 4: Tạo file HTML cho trang mới

**Vị trí:** `views/ten_thu_muc/ten_file.html`

**Ví dụ:** `views/reports/reports_content.html`

```html
<div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Báo cáo</h1>
    
    <!-- Nội dung trang của bạn -->
    <div class="bg-white rounded-lg shadow p-6">
        <p>Đây là nội dung trang Báo cáo</p>
    </div>
</div>
```

---

## Ví dụ hoàn chỉnh: Thêm trang "Báo cáo" (Reports)

### 1. Sửa `views/client_js.html`

```javascript
const pageMap = {
  'dashboard': 'page-dashboard',
  'topics': 'page-topics',
  'reports': 'page-reports'  // ← Thêm
};

const protectedPages = [
  'dashboard', 
  'topics', 
  'reports'  // ← Thêm (nếu cần đăng nhập)
];
```

### 2. Sửa `views/index.html`

```html
<div id="page-reports" class="page-content" style="display:none;">
    <?!= include('reports/reports_content'); ?>
</div>
```

### 3. Tạo file `views/reports/reports_content.html`

```html
<div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold">Báo cáo thống kê</h1>
    <!-- Nội dung trang -->
</div>
```

### 4. Thêm link điều hướng (tùy chọn)

Trong Sidebar hoặc Menu:

```html
<div class="nav-item" data-page="page-reports">
    <svg>...</svg>
    <span>Báo cáo</span>
</div>
```

Hoặc dùng onclick:

```html
<a href="#" onclick="showPage('page-reports'); return false;">
    📊 Báo cáo
</a>
```

---

## Cơ chế hoạt động của hệ thống F5

### 1. Lưu trang hiện tại
Mỗi khi người dùng chuyển trang (qua `showPage()`), hệ thống sẽ:
```javascript
localStorage.setItem("lastActivePage", pageId);
```

### 2. Khôi phục khi F5
Khi trang web load lại, hệ thống sẽ:
1. Kiểm tra `localStorage.getItem("lastActivePage")`
2. Nếu có → Gọi `showPage(savedPageId)`
3. Nếu không → Hiển thị trang mặc định

### 3. Code trong `client_js.html`

```javascript
document.addEventListener('DOMContentLoaded', function() {
    const savedPage = localStorage.getItem("lastActivePage");
    
    if (savedPage && pageMap[savedPage]) {
        const targetPage = pageMap[savedPage];
        console.log("✅ Recovered page from storage:", savedPage);
        showPage(targetPage, null, false);
    } else {
        showPage('page-landing', null, false);
    }
});
```

---

## Checklist kiểm tra

- [ ] Đã thêm trang vào `pageMap` (Bước 1)
- [ ] Đã phân loại trang vào `protectedPages` hoặc `authPages` (Bước 2)
- [ ] Đã tạo container `<div id="page-...">` trong `index.html` (Bước 3)
- [ ] Đã tạo file HTML cho trang mới (Bước 4)
- [ ] ID trong `pageMap` khớp với ID trong `index.html`
- [ ] Đã test: Click vào link → Trang hiển thị
- [ ] Đã test: F5 trên trang mới → Trang không reload về Landing
- [ ] Đã kiểm tra Console không có lỗi

---

## Debug và kiểm tra

### Kiểm tra trong Console (F12)
```javascript
// Xem trang đã lưu
console.log(localStorage.getItem("lastActivePage"));

// Xem pageMap hiện tại
console.log(pageMap);

// Xóa cache để test lại
localStorage.removeItem("lastActivePage");

// Xem tất cả localStorage
console.log(localStorage);
```

### Log trong code
Trong `client_js.html` đã có sẵn các dòng log:
```javascript
console.log("✅ Recovered page from storage:", savedPage);
console.log("🎯 Final Target Page:", targetPage);
```

---

## Lưu ý quan trọng

1. **Quy tắc đặt tên ID:** Luôn bắt đầu bằng `page-` (VD: `page-settings`, không phải `settings-page`)

2. **Key trong pageMap:** Sử dụng tên ngắn, không có prefix `page-` (VD: `'settings'`, không phải `'page-settings'`)

3. **Session Storage:** Hệ thống tự động lưu `localStorage.setItem("lastActivePage", "trang-moi")` khi chuyển trang

4. **Protected Pages:** Nếu user chưa login mà truy cập trang trong `protectedPages`, sẽ tự động chuyển về Login

5. **Deploy:** Sau khi sửa xong, nhớ **Deploy → New Deployment** để áp dụng thay đổi

6. **Clear cache:** Nếu gặp lỗi, thử xóa `localStorage` và hard refresh (Ctrl+Shift+R)

---

## Công thức tổng quát

```
TÊN TRANG NGẮN (VD: 'reports')
    ↓
pageMap: 'reports' → 'page-reports'
    ↓
index.html: <div id="page-reports">
    ↓
localStorage: "lastActivePage" = "reports"
    ↓
F5 → Khôi phục → showPage('page-reports')
```

---

## Xử lý lỗi phổ biến

### Lỗi 1: Trang không giữ khi F5
**Nguyên nhân:** Chưa thêm vào `pageMap`
**Giải pháp:** Kiểm tra lại Bước 1

### Lỗi 2: Trang bị chuyển về Login
**Nguyên nhân:** Trang nằm trong `protectedPages` nhưng user chưa login
**Giải pháp:** Kiểm tra session hoặc chuyển sang `authPages`

### Lỗi 3: Console báo lỗi `Cannot read properties of null`
**Nguyên nhân:** ID trong `pageMap` không khớp với ID trong `index.html`
**Giải pháp:** Kiểm tra lại ID ở cả 2 nơi

### Lỗi 4: Trang trắng sau khi F5
**Nguyên nhân:** File HTML chưa được tạo hoặc đường dẫn sai
**Giải pháp:** Kiểm tra lại path trong `include()` và file tồn tại

---

## Tham khảo thêm

- File chính: `views/client_js.html` (chứa logic showPage và pageMap)
- File layout: `views/index.html` (chứa tất cả containers)
- Sidebar: `views/sidebar/sidebar_scripts.html` (xử lý navigation)
- Protected pages: Kiểm tra auth trong `auth/login.js`