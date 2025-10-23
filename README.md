# 📚 Doanv2 - Hệ thống Học tập Thông minh

## 📋 Tổng quan dự án

Doanv2 là một hệ thống học tập thông minh được xây dựng trên Google Apps Script và Google Sheets, cung cấp các tính năng:

- Quản lý câu hỏi trắc nghiệm (MCQ)
- Trò chơi ghép nối (Matching Game)
- Tracking tiến độ học tập
- Tích hợp AI cho chatbot và gợi ý
- Quản trị hệ thống

## 🏗️ Kiến trúc hệ thống

```
Doanv2/
├── Code.js                 # Entry point & Router chính
├── config/
│   └── schema.js          # Cấu hình database schema
├── services/              # Business Logic Layer
│   ├── dbService.js       # Database operations
│   ├── userService.js     # Quản lý người dùng
│   ├── topicService.js    # Quản lý chủ đề
│   ├── mcqService.js      # Câu hỏi trắc nghiệm
│   ├── matchingService.js # Trò chơi ghép nối
│   ├── historyService.js  # Lịch sử học tập
│   ├── adminService.js    # Quản trị hệ thống
│   └── aiService.js       # Tích hợp AI
├── utils/                 # Utilities
│   ├── idGenerator.js     # Tạo ID tự động
│   ├── responseUtil.js    # Chuẩn hóa response
│   └── validationUtil.js  # Validation dữ liệu
└── models/                # Data Models
    ├── userModel.js       # User entity
    ├── topicModel.js      # Topic entity
    ├── mcqModel.js        # MCQ entity
    ├── matchingModel.js   # Matching entity
    ├── logModel.js        # Log entity
    └── progressModel.js   # Progress entity
```

### 📋 Quy tắc tạo ID:

| Tên Bảng           | Chữ cái đầu | Prefix | Ví dụ ID          |
| ------------------ | ----------- | ------ | ----------------- |
| **Users**          | U-S-R       | USR    | USR001, USR002... |
| **Topics**         | T-O-P       | TOP    | TOP001, TOP002... |
| **MCQ_Questions**  | M-C-Q       | MCQ    | MCQ001, MCQ002... |
| **Matching_Pairs** | M-A-T       | MAT    | MAT001, MAT002... |
| **Logs**           | L-O-G       | LOG    | LOG001, LOG002... |

### 🗂️ Cấu trúc bảng đã tối ưu:

#### **Topics Table:**

- **topicId** (Auto) - TOP001, TOP002...
- **title** - Tiêu đề chủ đề
- **description** - Mô tả chi tiết
- **category** - Danh mục (Math, English, Science...)

#### **MCQ_Questions Table:**

- **questionId** (Auto) - MCQ001, MCQ002...
- **topicId** (Foreign Key) - Dropdown chọn từ Topics
- **questionText** - Nội dung câu hỏi
- **optionA, optionB, optionC, optionD** - Các lựa chọn
- **correctAnswer** - Đáp án đúng (A/B/C/D)
- **explanation** - Giải thích đáp án
- **difficulty** (Dropdown) - Easy, Medium, Hard
- **hint** - Gợi ý cho câu hỏi
- **points** - Điểm số

#### **Matching_Pairs Table:**

- **pairId** (Auto) - MAT001, MAT002...
- **topicId** (Foreign Key) - Dropdown chọn từ Topics
- **leftItem** - Item bên trái
- **rightItem** - Item bên phải
- **itemType** - Loại item (text, image, audio)
- **difficulty** (Dropdown) - Easy, Medium, Hard
- **hints** - Gợi ý ghép nối

## 🔗 Database Relationships & Foreign Keys

### ✨ Tính năng Relationships:

- **Foreign Key Validation**: Tự động kiểm tra tính hợp lệ của khóa ngoại
- **Dropdown Selection**: Chọn ID từ dropdown thay vì nhập thủ công
- **Real-time Validation**: Kiểm tra ngay khi user nhập dữ liệu
- **Visual Indicators**: Highlight cột foreign key và trạng thái validation
- **Referential Integrity**: Đảm bảo tính toàn vẹn dữ liệu

### 📋 Sơ đồ Relationships:

```
Users (USR001, USR002...)
  ↓ (createdBy)
  ├── Topics (TOP001, TOP002...)
  │     ↓ (topicId)
  │     ├── MCQ_Questions (MCQ001, MCQ002...)
  │     └── Matching_Pairs (MAT001, MAT002...)
  └── Logs (LOG001, LOG002...)
```

### 🔗 Chi tiết Relationships:

| Bảng Child         | Cột Foreign Key | Bảng Parent | Cột Reference | Ràng buộc |
| ------------------ | --------------- | ----------- | ------------- | --------- |
| **MCQ_Questions**  | topicId         | Topics      | topicId       | RESTRICT  |
| **MCQ_Questions**  | createdBy       | Users       | userId        | SET_NULL  |
| **Matching_Pairs** | topicId         | Topics      | topicId       | RESTRICT  |
| **Matching_Pairs** | createdBy       | Users       | userId        | SET_NULL  |
| **Topics**         | createdBy       | Users       | userId        | SET_NULL  |
| **Logs**           | userId          | Users       | userId        | SET_NULL  |

### 🎯 **Tính năng đã tối ưu:**

- ❌ **Loại bỏ highlight màu** khi thêm dữ liệu
- ❌ **Bỏ các cột thừa**: createdBy, usageCount, successRate
- ✅ **Dropdown difficulty**: Easy, Medium, Hard cho MCQ + Matching
- ✅ **Thêm cột hint** cho MCQ_Questions
- ✅ **Đơn giản hóa Topics** chỉ còn 4 cột cơ bản

## 🔗 Database Schema

### 👥 Users

| Field        | Type    | Description           |
| ------------ | ------- | --------------------- |
| userId       | String  | USR001, USR002...     |
| username     | String  | Tên đăng nhập         |
| email        | String  | Email address         |
| passwordHash | String  | Mật khẩu đã hash      |
| fullName     | String  | Họ tên đầy đủ         |
| role         | String  | student/teacher/admin |
| createdAt    | Date    | Ngày tạo tài khoản    |
| lastLogin    | Date    | Lần đăng nhập cuối    |
| isActive     | Boolean | Trạng thái hoạt động  |

### 📚 Topics

| Field       | Type    | Description               |
| ----------- | ------- | ------------------------- |
| topicId     | String  | TOP001, TOP002...         |
| topicId     | String  | Tiêu đề chủ đề            |
| description | String  | Mô tả chi tiết            |
| category    | String  | Math, English, Science... |
| difficulty  | String  | Easy, Medium, Hard        |
| createdBy   | String  | Người tạo (userId)        |
| createdAt   | Date    | Ngày tạo                  |
| isPublic    | Boolean | Công khai hay riêng tư    |
| tags        | String  | Các tag liên quan         |
| viewCount   | Number  | Số lượt xem               |

### ❓ MCQ_Questions

| Field         | Type   | Description           |
| ------------- | ------ | --------------------- |
| questionId    | String | MCQ001, MCQ002...     |
| topicId       | String | ID chủ đề liên quan   |
| questionText  | String | Nội dung câu hỏi      |
| optionA       | String | Lựa chọn A            |
| optionB       | String | Lựa chọn B            |
| optionC       | String | Lựa chọn C            |
| optionD       | String | Lựa chọn D            |
| correctAnswer | String | Đáp án đúng (A/B/C/D) |
| explanation   | String | Giải thích đáp án     |
| difficulty    | String | Độ khó câu hỏi        |
| points        | Number | Điểm số               |
| createdBy     | String | Người tạo câu hỏi     |
| usageCount    | Number | Số lần được sử dụng   |

### 🎮 Matching_Pairs

| Field       | Type   | Description         |
| ----------- | ------ | ------------------- |
| pairId      | String | MAT001, MAT002...   |
| topicId     | String | ID chủ đề liên quan |
| leftItem    | String | Item bên trái       |
| rightItem   | String | Item bên phải       |
| itemType    | String | text, image, audio  |
| difficulty  | String | Độ khó của cặp      |
| hints       | String | Gợi ý nếu có        |
| createdBy   | String | Người tạo           |
| usageCount  | Number | Số lần được chơi    |
| successRate | Number | Tỷ lệ ghép đúng     |

### 📝 Logs

| Field     | Type   | Description               |
| --------- | ------ | ------------------------- |
| logId     | String | LOG001, LOG002...         |
| timestamp | Date   | Thời gian ghi log         |
| level     | String | INFO, WARN, ERROR, DEBUG  |
| category  | String | USER, SYSTEM, SECURITY... |
| userId    | String | User thực hiện action     |
| action    | String | Hành động được thực hiện  |
| details   | String | Chi tiết về log entry     |
| ipAddress | String | Địa chỉ IP                |
| userAgent | String | Browser/device info       |
| sessionId | String | ID phiên làm việc         |

## 🚀 Getting Started

### Yêu cầu hệ thống:

- Google Account
- Google Apps Script access
- Google Sheets
- Node.js (cho clasp CLI)

### Cài đặt:

1. Clone repository
2. Install clasp: `npm install -g @google/clasp`
3. Login: `clasp login`
4. Push code: `clasp push`

---

_Cập nhật lần cuối: October 18, 2025_

# Lịch sử phát triển dự án

- 18/10/2025: Viết hàm trigger tự động tạo ID khi nhập dữ liệu vào Google Sheets.
- 19/10/2025: Sửa lại cấu trúc trigger để đúng với Google Apps Script API.
- 19/10/2025: Cập nhật hệ thống ID tự động từ chữ cái đầu tên bảng + 3 chữ số.
- 19/10/2025: Thiết lập hệ thống Foreign Keys và Relationships với dropdown validation.
- 23/10/2025: Cập nhật: Hàm validateForeignKeyEdit (triggers.js) không còn hiển thị comment cảnh báo (cell.setNote) khi nhập sai foreign key. Chỉ ghi log, không popup lỗi, không highlight màu.
