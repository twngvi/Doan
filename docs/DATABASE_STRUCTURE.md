# Database Structure - Doanv3 Learning Management System

## Tổng quan

Hệ thống sử dụng 2 loại Google Sheets:

1. **MASTER_DB**: Google Sheet tổng chứa dữ liệu chung của toàn hệ thống
2. **USER*DB*<userId>**: Google Sheet cá nhân cho từng user

---

## 🗄️ MASTER_DB - Google Sheet Tổng

### 1. Users

**Mục đích**: Bảng định danh user - lưu thông tin cơ bản của tất cả users

| Column              | Type     | Description                           |
| ------------------- | -------- | ------------------------------------- |
| userId              | String   | ID duy nhất (USR001, USR002...)       |
| username            | String   | Tên đăng nhập                         |
| email               | String   | Email                                 |
| passwordHash        | String   | Hash của password                     |
| googleId            | String   | Google ID (nếu đăng nhập bằng Google) |
| avatarUrl           | String   | URL avatar                            |
| role                | String   | Vai trò (student, teacher, admin)     |
| level               | Number   | Level hiện tại (1, 2, 3...)           |
| totalXP             | Number   | Tổng điểm kinh nghiệm                 |
| mountainStage       | Number   | Giai đoạn leo núi (1-100)             |
| mountainProgress    | Number   | % tiến độ trong stage hiện tại        |
| aiLevel             | Number   | Cấp độ AI ước tính (1-10)             |
| **progressSheetId** | String   | **ID của Google Sheet cá nhân**       |
| emailVerified       | Boolean  | Email đã xác thực chưa                |
| verificationToken   | String   | Token để xác thực email               |
| verificationExpires | DateTime | Thời gian hết hạn token               |
| createdAt           | DateTime | Thời gian tạo tài khoản               |
| lastLogin           | DateTime | Lần đăng nhập cuối                    |
| isActive            | Boolean  | Tài khoản có hoạt động không          |

---

### 2. Topics

**Mục đích**: Danh sách các chủ đề học tập

| Column      | Type     | Description                                   |
| ----------- | -------- | --------------------------------------------- |
| topicId     | String   | ID topic (TOP001, TOP002...)                  |
| title       | String   | Tiêu đề chủ đề                                |
| description | String   | Mô tả                                         |
| journey     | String   | Hành trình (Beginner, Intermediate, Advanced) |
| category    | String   | Danh mục                                      |
| orderIndex  | Number   | Thứ tự hiển thị                               |
| totalStages | Number   | Tổng số stage                                 |
| minAILevel  | Number   | AI level tối thiểu để mở                      |
| minAccuracy | Number   | % độ chính xác tối thiểu                      |
| createdAt   | DateTime | Ngày tạo                                      |

---

### 3. MCQ_Questions

**Mục đích**: Câu hỏi trắc nghiệm (Multiple Choice Questions)

| Column        | Type   | Description                 |
| ------------- | ------ | --------------------------- |
| questionId    | String | ID câu hỏi (MCQ001...)      |
| topicId       | String | ID chủ đề                   |
| questionText  | String | Nội dung câu hỏi            |
| optionA       | String | Đáp án A                    |
| optionB       | String | Đáp án B                    |
| optionC       | String | Đáp án C                    |
| optionD       | String | Đáp án D                    |
| correctAnswer | String | Đáp án đúng (A/B/C/D)       |
| explanation   | String | Giải thích                  |
| difficulty    | String | Độ khó (Easy, Medium, Hard) |
| hint          | String | Gợi ý                       |
| points        | Number | Điểm thưởng                 |

---

### 4. Matching_Pairs

**Mục đích**: Cặp ghép nối (Matching Game)

| Column      | Type   | Description              |
| ----------- | ------ | ------------------------ |
| pairId      | String | ID cặp ghép (MAT001...)  |
| topicId     | String | ID chủ đề                |
| leftItem    | String | Item bên trái            |
| rightItem   | String | Item bên phải            |
| itemType    | String | Loại (text, image, code) |
| difficulty  | String | Độ khó                   |
| explanation | String | Giải thích               |
| hints       | String | Gợi ý                    |
| points      | Number | Điểm thưởng              |

---

### 5. Mini_Challenges

**Mục đích**: Thử thách nhỏ đa dạng (fill blank, code challenge...)

| Column        | Type   | Description                     |
| ------------- | ------ | ------------------------------- |
| challengeId   | String | ID challenge (CHL001...)        |
| topicId       | String | ID chủ đề                       |
| type          | String | Loại (fill_blank, code, puzzle) |
| description   | String | Mô tả                           |
| contentJSON   | String | Nội dung dạng JSON              |
| correctAnswer | String | Đáp án đúng                     |
| explanation   | String | Giải thích                      |
| difficulty    | String | Độ khó                          |
| points        | Number | Điểm thưởng                     |

---

### 6. Achievements

**Mục đích**: Danh sách thành tựu có thể đạt được

| Column        | Type   | Description              |
| ------------- | ------ | ------------------------ |
| achievementId | String | ID thành tựu (ACH001...) |
| title         | String | Tiêu đề                  |
| description   | String | Mô tả                    |
| conditionJSON | String | Điều kiện dạng JSON      |
| icon          | String | Icon/emoji               |
| points        | Number | Điểm thưởng              |

---

### 7. Leaderboard

**Mục đích**: Bảng xếp hạng toàn hệ thống

| Column        | Type     | Description       |
| ------------- | -------- | ----------------- |
| rank          | Number   | Hạng              |
| userId        | String   | ID user           |
| username      | String   | Tên user          |
| totalXP       | Number   | Tổng XP           |
| mountainStage | Number   | Giai đoạn núi     |
| aiLevel       | Number   | Cấp độ AI         |
| lastUpdated   | DateTime | Cập nhật lần cuối |

---

### 8. Logs

**Mục đích**: Log hoạt động của hệ thống

| Column    | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| logId     | String   | ID log (LOG001...)            |
| timestamp | DateTime | Thời gian                     |
| level     | String   | Mức độ (INFO, WARNING, ERROR) |
| category  | String   | Danh mục (USER, GAME, SYSTEM) |
| userId    | String   | ID user liên quan             |
| action    | String   | Hành động                     |
| details   | String   | Chi tiết                      |
| ipAddress | String   | IP address                    |
| sessionId | String   | ID session                    |

---

### 9. Error_Logs

**Mục đích**: Log lỗi chi tiết

| Column    | Type     | Description             |
| --------- | -------- | ----------------------- |
| timestamp | DateTime | Thời gian               |
| step      | String   | Bước xảy ra lỗi         |
| error     | String   | Thông báo lỗi           |
| userId    | String   | ID user (nếu có)        |
| duration  | Number   | Thời gian thực thi (ms) |
| stack     | String   | Stack trace             |

---

## 👤 USER*DB*<userId> - Google Sheet Cá Nhân

Mỗi user có 1 Google Sheet riêng với tên: `USER_DB_USR001`, `USER_DB_USR002`...

### 1. Profile

**Mục đích**: Thông tin cá nhân và tổng quan học tập

| Column         | Type     | Description               |
| -------------- | -------- | ------------------------- |
| userId         | String   | ID user                   |
| username       | String   | Tên user                  |
| level          | Number   | Level hiện tại            |
| totalXP        | Number   | Tổng điểm kinh nghiệm     |
| aiLevel        | Number   | Cấp độ AI                 |
| mountainStage  | Number   | Giai đoạn núi             |
| currentStreak  | Number   | Chuỗi ngày học liên tiếp  |
| bestStreak     | Number   | Chuỗi dài nhất            |
| totalTimeSpent | Number   | Tổng thời gian học (phút) |
| joinedAt       | DateTime | Ngày tham gia             |
| lastActive     | DateTime | Lần hoạt động cuối        |

---

### 2. Topic_Progress

**Mục đích**: Tiến trình học tập từng chủ đề

| Column        | Type     | Description                                           |
| ------------- | -------- | ----------------------------------------------------- |
| progressId    | String   | ID progress (PRG001...)                               |
| topicId       | String   | ID chủ đề                                             |
| topicTitle    | String   | Tên chủ đề                                            |
| quizDone      | Number   | Số quiz đã làm                                        |
| matchingDone  | Number   | Số matching đã làm                                    |
| challengeDone | Number   | Số challenge đã làm                                   |
| attempts      | Number   | Số lần thử                                            |
| accuracy      | Number   | % độ chính xác                                        |
| bestScore     | Number   | Điểm cao nhất                                         |
| xpEarned      | Number   | XP đã kiếm                                            |
| aiScore       | Number   | Điểm AI đánh giá                                      |
| aiDecision    | String   | Quyết định của AI (unlock_next, retry, review)        |
| status        | String   | Trạng thái (locked, unlocked, in_progress, completed) |
| unlockedAt    | DateTime | Thời gian mở khóa                                     |
| completedAt   | DateTime | Thời gian hoàn thành                                  |

---

### 3. Game_History

**Mục đích**: Lịch sử chơi game chi tiết

| Column       | Type     | Description                          |
| ------------ | -------- | ------------------------------------ |
| historyId    | String   | ID history (HST001...)               |
| topicId      | String   | ID chủ đề                            |
| gameType     | String   | Loại game (mcq, matching, challenge) |
| questionId   | String   | ID câu hỏi                           |
| userAnswer   | String   | Câu trả lời của user                 |
| isCorrect    | Boolean  | Đúng/sai                             |
| timeSpent    | Number   | Thời gian làm bài (giây)             |
| pointsEarned | Number   | Điểm nhận được                       |
| hintUsed     | Boolean  | Có dùng gợi ý không                  |
| playedAt     | DateTime | Thời gian chơi                       |

---

### 4. Knowledge_Notebook

**Mục đích**: Sổ ghi chú kiến thức cá nhân

| Column     | Type     | Description                   |
| ---------- | -------- | ----------------------------- |
| noteId     | String   | ID note (NOTE001...)          |
| topicId    | String   | ID chủ đề                     |
| questionId | String   | ID câu hỏi liên quan          |
| title      | String   | Tiêu đề ghi chú               |
| content    | String   | Nội dung                      |
| tags       | String   | Tags (phân cách bởi dấu phẩy) |
| savedAt    | DateTime | Thời gian lưu                 |

---

### 5. AI_Evaluations

**Mục đích**: Đánh giá AI chi tiết

| Column             | Type     | Description                |
| ------------------ | -------- | -------------------------- |
| evaluationId       | String   | ID evaluation (EVAL001...) |
| topicId            | String   | ID chủ đề được đánh giá    |
| accuracyScore      | Number   | Điểm độ chính xác (0-100)  |
| speedScore         | Number   | Điểm tốc độ (0-100)        |
| logicScore         | Number   | Điểm logic (0-100)         |
| consistencyScore   | Number   | Điểm nhất quán (0-100)     |
| finalScore         | Number   | Điểm tổng kết (0-100)      |
| estimatedLevel     | Number   | Level ước tính (1-10)      |
| strengths          | String   | Điểm mạnh                  |
| weaknesses         | String   | Điểm yếu                   |
| recommendNextTopic | String   | Topic đề xuất tiếp theo    |
| evaluatedAt        | DateTime | Thời gian đánh giá         |

---

### 6. Achievements

**Mục đích**: Thành tựu đã đạt được

| Column            | Type     | Description                              |
| ----------------- | -------- | ---------------------------------------- |
| userAchievementId | String   | ID achievement của user (UACH001...)     |
| achievementId     | String   | ID achievement (tham chiếu từ MASTER_DB) |
| title             | String   | Tiêu đề thành tựu                        |
| points            | Number   | Điểm thưởng                              |
| unlockedAt        | DateTime | Thời gian mở khóa                        |

---

### 7. Session_Logs

**Mục đích**: Log phiên đăng nhập

| Column    | Type     | Description            |
| --------- | -------- | ---------------------- |
| sessionId | String   | ID session (SES001...) |
| loginAt   | DateTime | Thời gian đăng nhập    |
| logoutAt  | DateTime | Thời gian đăng xuất    |
| device    | String   | Thiết bị               |
| ipAddress | String   | IP address             |

---

## 🔧 Cách sử dụng

### Khởi tạo Database

```javascript
// Tạo MASTER_DB
function initializeDatabase() {
  const url = createAllSheets();
  Logger.log("Database URL: " + url);
}
```

### Đăng ký User mới

```javascript
// User đăng ký → tự động tạo USER_DB
const result = registerUser({
  username: "john_doe",
  password: "password123",
  email: "john@example.com",
  fullName: "John Doe",
});

// Kết quả trả về progressSheetId
Logger.log("Progress Sheet: " + result.user.progressSheetId);
```

### Lấy dữ liệu User

```javascript
// Lấy profile
const profile = getUserProfile("USR001");

// Lấy topic progress
const progress = getUserTopicProgress("USR001");

// Lấy game history
const history = getGameHistory("USR001", {
  topicId: "TOP001",
  limit: 10,
});
```

### Cập nhật dữ liệu

```javascript
// Cập nhật topic progress
updateTopicProgress("USR001", {
  topicId: "TOP001",
  quizDone: 5,
  accuracy: 80,
  xpEarned: 100,
});

// Thêm game history
addGameHistory("USR001", {
  topicId: "TOP001",
  gameType: "mcq",
  questionId: "MCQ001",
  isCorrect: true,
  pointsEarned: 10,
});

// Lưu note
saveKnowledgeNote("USR001", {
  topicId: "TOP001",
  title: "Công thức quan trọng",
  content: "2 + 2 = 4",
  tags: "math, basic",
});
```

---

## 📝 Files liên quan

- **config/schema.js**: Định nghĩa cấu trúc database
- **server/users.gs**: Quản lý user registration/login
- **server/userOperations.gs**: CRUD operations cho USER_DB
- **services/authService.js**: Authentication service

---

## 🔐 Bảo mật

- Mỗi user chỉ có quyền truy cập vào USER_DB của mình
- MASTER_DB chỉ được truy cập bởi server-side code
- Password được hash trước khi lưu (nếu implement)
- Session được track trong Session_Logs

---

## 🚀 Tính năng nổi bật

✅ **Tách biệt dữ liệu**: Master DB và Personal DB riêng biệt
✅ **Scalable**: Mỗi user 1 sheet, không bị giới hạn rows
✅ **AI Integration**: Đánh giá và đề xuất tự động
✅ **Gamification**: XP, Level, Mountain stages, Achievements
✅ **Analytics**: Tracking chi tiết game history và progress
✅ **Knowledge Management**: Personal notebook cho từng user
