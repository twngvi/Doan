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

## 🔄 Hệ thống Auto-ID Generation

### ✨ Tính năng chính:

- **ID tự động tạo** từ chữ cái đầu của tên bảng + 3 chữ số
- **Format thống nhất**: PREFIX + số có 3 chữ số (001, 002, 003...)
- **Không trùng lặp**: Luôn tăng dần và unique
- **Multi-row support**: Tạo ID cho nhiều hàng cùng lúc

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

### 🚀 Cách hoạt động:

1. **Phát hiện sheet**: Hệ thống nhận biết tên sheet
2. **Lấy prefix**: Áp dụng prefix tương ứng từ chữ cái đầu
3. **Tìm số cao nhất**: Quét tất cả ID hiện có với prefix đó
4. **Tạo ID mới**: Tăng số cao nhất lên 1, format 3 chữ số
5. **Gán ID**: Tự động điền vào cột đầu tiên

### 💡 Ví dụ thực tế:

**Sheet Users đã có:** USR001, USR003, USR005
**→ ID mới sẽ là:** USR006 (không phải USR004!)

**Sheet MCQ_Questions trống**
**→ ID đầu tiên:** MCQ001

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

### 🎯 Cách sử dụng Foreign Keys:

#### **1. Thêm câu hỏi trắc nghiệm:**

- Mở sheet **MCQ_Questions**
- Cột **topicId**: Chọn từ dropdown các topic có sẵn
- Cột **createdBy**: Chọn từ dropdown các user có sẵn
- Hệ thống sẽ kiểm tra tính hợp lệ realtime

#### **2. Thêm trò chơi ghép nối:**

- Mở sheet **Matching_Pairs**
- Cột **topicId**: Dropdown hiển thị "TOP001 - Toán học cơ bản"
- Chọn topic phù hợp cho trò chơi

#### **3. Validation Rules:**

- ✅ **RESTRICT**: Không thể xóa Topics nếu có MCQ_Questions tham chiếu
- ✅ **SET_NULL**: Khi xóa User, các record tham chiếu sẽ để trống createdBy
- ✅ **CASCADE**: Khi sửa ID trong bảng cha, tự động cập nhật bảng con

## 🔄 Quy trình làm việc với Relationships

### 1. **Thiết lập Database + Relationships:**

```javascript
initializeDatabase(); // Tạo DB_Master
setupAutoIds(); // Thiết lập Auto-ID
setupRelationships(); // Thiết lập Foreign Keys
```

### 2. **Test Relationships:**

```javascript
testRelationships(); // Kiểm tra foreign key validation
```

### 3. **Refresh Validations (nếu cần):**

```javascript
refreshRelationships(); // Cập nhật lại dropdown sau khi thêm dữ liệu
```

### 4. **Workflow thêm dữ liệu có liên quan:**

```
Step 1: Thêm Users     → Tạo USR001, USR002...
Step 2: Thêm Topics    → Chọn createdBy từ dropdown Users
Step 3: Thêm Questions → Chọn topicId từ dropdown Topics
Step 4: Thêm Matching  → Chọn topicId từ dropdown Topics
```

### 💡 **Visual Indicators:**

- 🔗 **Yellow Background**: Cột Foreign Key
- ✅ **Green Background**: Valid foreign key value
- ❌ **Red Background**: Invalid foreign key value
- 📝 **Dropdown Arrow**: Có thể chọn từ danh sách
- 💬 **Note Popup**: Hướng dẫn và lỗi validation

## 🔄 Quy trình làm việc với Database tối ưu

### 1. **Thiết lập Database:**

```javascript
initializeDatabase(); // Tạo DB_Master với cấu trúc tối ưu
```

### 2. **Thiết lập Auto-ID + Relationships:**

```javascript
setupAutoIds(); // Cấu hình tạo ID tự động
setupRelationships(); // Thiết lập Foreign Keys + Difficulty Dropdowns
```

### 3. **Thêm dữ liệu mẫu:**

```javascript
addSampleQuestions(); // Thêm câu hỏi mẫu để test
```

### 4. **Test hệ thống:**

```javascript
testMultiRow(); // Test tạo ID tự động cho nhiều hàng cùng lúc
testRelationships(); // Test foreign key validation
```

> 💡 **Tip:**
>
> - Hệ thống đã loại bỏ highlight màu theo yêu cầu
> - Difficulty có dropdown: Easy, Medium, Hard
> - Topics chỉ còn 4 cột cơ bản: topicId, title, description, category
> - MCQ_Questions thêm cột hint, bỏ createdBy và usageCount
> - Matching_Pairs bỏ createdBy, usageCount, successRate

### 🎯 **Tính năng đã tối ưu:**

- ❌ **Loại bỏ highlight màu** khi thêm dữ liệu
- ❌ **Bỏ các cột thừa**: createdBy, usageCount, successRate
- ✅ **Dropdown difficulty**: Easy, Medium, Hard cho MCQ + Matching
- ✅ **Thêm cột hint** cho MCQ_Questions
- ✅ **Đơn giản hóa Topics** chỉ còn 4 cột cơ bản

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
- 19/10/2025: Cập nhật hệ thống ID tự động từ chữ cái đầu tên bảng + 3 chữ số.
- 19/10/2025: Thiết lập hệ thống Foreign Keys và Relationships với dropdown validation.
