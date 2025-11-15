# 📁 Cấu trúc Project - Doanv3

## 🗂️ Tổ chức thư mục

```
Doanv3/
├── 📄 Root Files (Cấu hình & Documentation)
│   ├── .clasp.json              # Cấu hình clasp
│   ├── appsscript.json          # Cấu hình Apps Script
│   ├── Code.js                  # Entry point database setup
│   ├── triggers.js              # Google Sheets triggers
│   ├── README.md                # Tổng quan dự án
│   ├── QUICKSTART.md            # Hướng dẫn nhanh
│   ├── DEPLOYMENT_GUIDE.md      # Hướng dẫn deploy chi tiết
│   ├── CHECKLIST.md             # Checklist deploy
│   ├── COMMANDS_REFERENCE.md    # Tham khảo lệnh
│   └── PROJECT_STRUCTURE.md     # File này
│
├── 🖥️ server/ (Backend - Google Apps Script)
│   ├── main.gs                  # Entry point Web App (doGet)
│   ├── users.gs                 # User authentication
│   └── utils.gs                 # Helper functions
│
├── 🎨 views/ (Frontend - HTML/CSS/JS)
│   ├── index.html               # SPA container
│   ├── styles.html              # CSS & Tailwind
│   ├── client_js.html           # Client-side JavaScript
│   ├── page_login.html          # Trang đăng nhập
│   ├── page_register.html       # Trang đăng ký
│   ├── page_dashboard.html      # Trang dashboard
│   ├── page_topics.html         # Trang chủ đề
│   ├── page_mcq.html            # Trang trắc nghiệm
│   ├── page_matching.html       # Trang ghép nối
│   └── page_profile.html        # Trang profile
│
├── ⚙️ config/ (Cấu hình)
│   └── schema.js                # Database schema
│
├── 🔧 services/ (Business Logic - Future Use)
│   ├── adminService.js          # Quản trị hệ thống
│   ├── aiService.js             # Tích hợp AI
│   ├── dbService.js             # Database operations
│   ├── historyService.js        # Lịch sử học tập
│   ├── matchingService.js       # Matching game
│   ├── mcqService.js            # MCQ quiz
│   ├── relationshipService.js   # Foreign keys
│   ├── topicService.js          # Topic management
│   └── userService.js           # User management
│
├── 📦 models/ (Data Models - Future Use)
│   ├── logModel.js              # Log model
│   ├── matchingModel.js         # Matching model
│   ├── mcqModel.js              # MCQ model
│   ├── progressModel.js         # Progress model
│   ├── topicModel.js            # Topic model
│   └── userModel.js             # User model
│
├── 🛠️ utils/ (Utilities - Future Use)
│   ├── idGenerator.js           # ID generation
│   ├── responseUtil.js          # Response formatting
│   └── validationUtil.js        # Data validation
│
└── 📚 docs/ (Documentation)
    ├── CLASP_CONFIG.md          # Cấu hình clasp
    └── Infor_v3.txt             # Thông tin version 3
```

---

## 📝 Chi tiết các thư mục

### 🖥️ **server/** - Backend Logic

Chứa các file Google Apps Script (.gs) xử lý logic phía server:

- **main.gs**: Entry point, xử lý HTTP requests (doGet), include HTML files
- **users.gs**: Authentication (register, login), user management
- **utils.gs**: Helper functions (hash password, generate ID, logging)

### 🎨 **views/** - Frontend UI

Chứa tất cả file HTML, CSS, JavaScript cho giao diện:

- **index.html**: Container chính của SPA, include tất cả pages
- **styles.html**: Tailwind CSS + custom styles
- **client_js.html**: JavaScript client-side (navigation, forms, API calls)
- **page\_\*.html**: Các trang riêng biệt (login, register, dashboard, etc.)

### ⚙️ **config/** - Configuration

Cấu hình hệ thống:

- **schema.js**: Database schema, table structure, relationships

### 🔧 **services/** - Business Services (Dành cho tương lai)

Các service layer để implement logic phức tạp:

- CRUD operations cho từng entity
- Business rules và validation
- Integration với external APIs

### 📦 **models/** - Data Models (Dành cho tương lai)

Định nghĩa cấu trúc dữ liệu:

- Entity schemas
- Data transformation
- Validation rules

### 🛠️ **utils/** - Utilities (Dành cho tương lai)

Helper functions tái sử dụng:

- ID generation
- Response formatting
- Data validation

### 📚 **docs/** - Documentation

Tài liệu kỹ thuật và hướng dẫn

---

## 🔄 File References

### Trong `server/main.gs`:

```javascript
// Tham chiếu đến views/index.html
const template = HtmlService.createTemplateFromFile("views/index");
```

### Trong `views/index.html`:

```html
<!-- Include các file HTML khác -->
<?!= include('views/styles'); ?>
<?!= include('views/page_login'); ?>
<?!= include('views/client_js'); ?>
```

### Trong `.clasp.json`:

```json
{
  "rootDir": "", // Root của project
  "skipSubdirectories": false // Push cả subdirectories
}
```

---

## 📤 Deployment Flow

```
Local Development
    ↓
clasp push
    ↓
Google Apps Script
    ├── server/main.gs → main.gs
    ├── server/users.gs → users.gs
    ├── server/utils.gs → utils.gs
    ├── views/index.html → views/index.html
    ├── views/styles.html → views/styles.html
    └── ... (giữ nguyên cấu trúc folder)
    ↓
Deploy as Web App
    ↓
Web App URL
```

---

## ✨ Ưu điểm cấu trúc mới

✅ **Tổ chức rõ ràng**: Tách biệt backend (server), frontend (views), config  
✅ **Dễ bảo trì**: Mỗi loại file có folder riêng  
✅ **Scalable**: Dễ mở rộng thêm pages, services, models  
✅ **Professional**: Cấu trúc chuẩn MVC-like  
✅ **Clean**: Không còn folder "backend" gây nhầm lẫn

---

## 🚀 Commands sau khi thay đổi cấu trúc

```powershell
# Push code lên Apps Script (giữ nguyên cấu trúc folder)
clasp push

# Deploy
clasp deploy --description "New structure v1.1"

# Test
# Mở Web App URL và kiểm tra
```

---

## 📋 Checklist sau khi đổi cấu trúc

- [x] Di chuyển .gs files vào `server/`
- [x] Di chuyển .html files vào `views/`
- [x] Cập nhật `server/main.gs` - tham chiếu `views/index`
- [x] Cập nhật `views/index.html` - tham chiếu `views/*`
- [x] Push code: `clasp push --force`
- [ ] Test Web App hoạt động bình thường
- [ ] Kiểm tra login/register/dashboard

---

**Cấu trúc mới sạch đẹp, professional hơn! 🎉**
