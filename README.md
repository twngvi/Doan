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

## ✅ Tính năng đã hoàn thành

### 🔧 Core Infrastructure

- [x] **Cấu trúc project** - Tổ chức code theo layered architecture
- [x] **Database schema** - Định nghĩa cấu trúc Google Sheets database
- [x] **Auto ID generation** - Hệ thống tạo ID tự động với format PREFIX + số

### 📊 Database Management

- [x] **DB_Master creation** - Tạo Google Sheets database chính
- [x] **5 sheets chính:**
  - Users (USR001, USR002...)
  - Topics (TOP001, TOP002...)
  - MCQ_Questions (MCQ001, MCQ002...)
  - Matching_Pairs (MAT001, MAT002...)
  - Logs (LOG001, LOG002...)
- [x] **Auto-fill IDs** - Tự động điền ID khi thêm dữ liệu
- [x] **ID sorting** - Sắp xếp ID theo thứ tự tăng dần

### 🛠️ Development Tools

- [x] **Code structure** - Tổ chức code modular, dễ maintain
- [x] **Documentation** - Comment chi tiết cho từng file và function
- [x] **Testing functions** - Các hàm test cho từng tính năng

## 🔄 Quy trình làm việc hiện tại

### 1. **Thiết lập Database:**

```javascript
initializeDatabase(); // Tạo DB_Master với 5 sheets
```

### 2. **Thiết lập Auto-ID:**

```javascript
setupAutoIds(); // Cấu hình tạo ID tự động
```

### 3. **Thêm dữ liệu mẫu:**

```javascript
addSampleQuestions(); // Thêm câu hỏi mẫu để test
```

## 📈 Tiến độ dự án

### ✅ Đã hoàn thành (100%)

1. **Project Setup** - Cấu trúc code và kiến trúc
2. **Database Schema** - Thiết kế và tạo database
3. **Auto ID System** - Hệ thống tạo ID tự động
4. **Core Models** - Định nghĩa các entity chính

### 🔄 Đang phát triển (0%)

1. **Business Logic Services** - Implement các service layer
2. **API Endpoints** - Tạo REST API cho client
3. **User Management** - Đăng ký, đăng nhập, phân quyền
4. **Question Management** - CRUD câu hỏi trắc nghiệm

### 📋 Sắp làm

1. **Frontend Integration** - Tích hợp với giao diện người dùng
2. **AI Integration** - Chatbot và gợi ý thông minh
3. **Analytics & Reports** - Báo cáo và thống kê
4. **Mobile Support** - Tối ưu cho mobile

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
| title       | String  | Tiêu đề chủ đề            |
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
5. Chạy `initializeDatabase()` để tạo database

## 👥 Contributors

- **Developer:** twngvi
- **Project:** Doanv2 Learning System

## 📄 License

Private Project - Educational Purpose

---

_Cập nhật lần cuối: October 18, 2025_

# Lịch sử phát triển dự án

- 18/10/2025: Viết hàm trigger tự động tạo ID khi nhập dữ liệu vào Google Sheets.
- 19/10/2025: Sửa lại cấu trúc trigger để đúng với Google Apps Script API.
