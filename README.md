# 📚 Doanv3 - Hệ thống Học tập Thông minh

## 📋 Tổng quan dự án

Doanv3 là một hệ thống học tập thông minh được xây dựng trên Google Apps Script và Google Sheets với kiến trúc **2 tầng database**:

- ✅ **MASTER_DB**: Database tổng cho toàn hệ thống
- ✅ **USER_DB**: Database cá nhân riêng cho từng user

### 🎯 Tính năng chính

- 📝 Quản lý câu hỏi trắc nghiệm (MCQ)
- 🎮 Trò chơi ghép nối (Matching Game)
- 🏆 Mini Challenges đa dạng
- 📊 Tracking tiến độ học tập chi tiết
- 🤖 AI Evaluation & Recommendation System
- 🏅 Gamification: XP, Level, Mountain Climbing
- 🎖️ Achievement System
- 📚 Personal Knowledge Notebook
- 📈 Leaderboard toàn hệ thống

## 🏗️ Kiến trúc hệ thống

```
Doan/
├── Code.js                      # Entry point
├── config/
│   └── schema.js               # ⭐ Database schema (MASTER_DB + USER_DB)
├── server/                     # Server-side logic
│   ├── main.gs                 # Web app entry point
│   ├── users.gs                # User registration/login
│   ├── userOperations.gs       # ⭐ USER_DB CRUD operations
│   └── utils.gs                # Utility functions
├── services/                   # Business Logic
│   ├── authService.js          # Authentication & Authorization
│   └── relationshipService.js  # Data relationships
├── views/                      # Frontend HTML templates
│   ├── index.html              # Main SPA
│   ├── page_dashboard.html     # Dashboard
│   ├── page_login.html         # Login page
│   └── ...
└── docs/                       # ⭐ Documentation
    ├── DATABASE_STRUCTURE.md   # Chi tiết cấu trúc DB
    ├── MIGRATION_GUIDE.md      # Hướng dẫn migration
    ├── QUICK_START.md         # Quick start guide
    └── SUMMARY.md             # Tóm tắt project
```

## 🗄️ Cấu trúc Database

### MASTER_DB (Google Sheet Tổng)

| Sheet           | Mục đích                                |
| --------------- | --------------------------------------- |
| Users           | Bảng định danh user với progressSheetId |
| Topics          | Danh sách chủ đề học tập                |
| MCQ_Questions   | Câu hỏi trắc nghiệm                     |
| Matching_Pairs  | Cặp ghép nối                            |
| Mini_Challenges | Thử thách mini                          |
| Achievements    | Danh sách thành tựu                     |
| Leaderboard     | Bảng xếp hạng                           |
| Logs            | Log hoạt động hệ thống                  |
| Error_Logs      | Log lỗi chi tiết                        |

### USER*DB*<userId> (Google Sheet Cá Nhân)

| Sheet              | Mục đích                      |
| ------------------ | ----------------------------- |
| Profile            | Thông tin cá nhân & tổng quan |
| Topic_Progress     | Tiến trình từng chủ đề        |
| Game_History       | Lịch sử chơi game chi tiết    |
| Knowledge_Notebook | Sổ ghi chú cá nhân            |
| AI_Evaluations     | Đánh giá AI                   |
| Achievements       | Thành tựu đã đạt              |
| Session_Logs       | Log phiên đăng nhập           |

### 📋 Quy tắc tạo ID:

| Bảng            | Prefix | Ví dụ               |
| --------------- | ------ | ------------------- |
| Users           | USR    | USR001, USR002...   |
| Topics          | TOP    | TOP001, TOP002...   |
| MCQ_Questions   | MCQ    | MCQ001, MCQ002...   |
| Matching_Pairs  | MAT    | MAT001, MAT002...   |
| Mini_Challenges | CHL    | CHL001, CHL002...   |
| Achievements    | ACH    | ACH001, ACH002...   |
| Logs            | LOG    | LOG001, LOG002...   |
| Error_Logs      | ERR    | ERR001, ERR002...   |
| Progress        | PRG    | PRG001, PRG002...   |
| History         | HST    | HST001, HST002...   |
| Notes           | NOTE   | NOTE001, NOTE002... |
| Evaluations     | EVAL   | EVAL001, EVAL002... |

## 🚀 Quick Start

### 1. Khởi tạo Database

```javascript
// Mở Google Apps Script Editor và chạy:
function setupDatabase() {
  const url = createAllSheets();
  Logger.log("✅ MASTER_DB created: " + url);
}
```

### 2. Đăng ký User mới

```javascript
const result = registerUser({
  username: "john_doe",
  password: "password123",
  email: "john@example.com",
  fullName: "John Doe",
});

// USER_DB_USR001 sẽ được tạo tự động!
Logger.log("Progress Sheet: " + result.user.progressSheetId);
```

### 3. Sử dụng API

```javascript
// Lấy profile
const profile = getUserProfile("USR001");

// Cập nhật progress
updateTopicProgress("USR001", {
  topicId: "TOP001",
  quizDone: 5,
  accuracy: 80,
});

// Thêm game history
addGameHistory("USR001", {
  topicId: "TOP001",
  gameType: "mcq",
  isCorrect: true,
  pointsEarned: 10,
});
```

## 📚 Documentation

- **[DATABASE_STRUCTURE.md](./docs/DATABASE_STRUCTURE.md)** - Chi tiết đầy đủ về cấu trúc database
- **[MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md)** - Hướng dẫn migrate từ version cũ
- **[QUICK_START.md](./docs/QUICK_START.md)** - Hướng dẫn nhanh cho developers
- **[SUMMARY.md](./docs/SUMMARY.md)** - Tóm tắt toàn bộ project

## 🎯 Key Features

### ✅ Gamification System

- Level progression (1-100)
- XP points system
- Mountain climbing stages
- Achievement badges
- Global leaderboard

### ✅ AI Integration

- Performance evaluation
- Adaptive difficulty
- Topic recommendation
- Strength/weakness analysis
- Personalized learning path

### ✅ Personal Learning

- Individual progress tracking
- Personal knowledge notebook
- Game history analytics
- Session logging
- Custom achievements

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
