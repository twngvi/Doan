# Quick Start Guide - Doanv3 Database Structure

## Khởi tạo Database mới (Fresh Install)

### 1. Tạo MASTER_DB

```javascript
// Mở Script Editor và chạy function này
function setupNewDatabase() {
  // Tạo MASTER_DB với tất cả sheets
  const url = createAllSheets();
  Logger.log("✅ MASTER_DB created: " + url);

  // Setup validation và auto-ID
  setupDifficultyDropdowns();
  Logger.log("✅ Dropdowns configured");

  return url;
}
```

### 2. Thêm dữ liệu mẫu (Optional)

```javascript
function addSampleDataToDatabase() {
  addSampleData(); // Từ schema.js
  Logger.log("✅ Sample data added");
}
```

### 3. Test đăng ký user

```javascript
function testUserRegistration() {
  const result = registerUser({
    username: "test_user",
    password: "password123",
    email: "test@example.com",
    fullName: "Test User",
  });

  Logger.log(result);

  if (result.status === "success") {
    Logger.log("✅ User registered");
    Logger.log("Progress Sheet ID: " + result.user.progressSheetId);
  }
}
```

---

## Cấu trúc Files

```
Doan/
├── config/
│   └── schema.js                 # ⭐ Database schema & user sheet creation
├── server/
│   ├── main.gs                   # Web app entry point
│   ├── users.gs                  # User registration/login
│   ├── userOperations.gs         # ⭐ USER_DB operations
│   └── utils.gs                  # Utility functions
├── services/
│   ├── authService.js            # Authentication
│   └── relationshipService.js    # Relationships (nếu có)
└── docs/
    ├── DATABASE_STRUCTURE.md     # ⭐ Chi tiết cấu trúc DB
    ├── MIGRATION_GUIDE.md        # ⭐ Hướng dẫn migration
    └── QUICK_START.md           # File này
```

---

## Các Functions chính

### Schema Management (schema.js)

```javascript
// Tạo database
createAllSheets();

// Update schema
updateAllSheetsSchema();

// Tạo user personal sheet
createUserPersonalSheet(userId, username);

// Tìm user sheet
findUserProgressSheet(userId);

// Lấy user spreadsheet
getUserSpreadsheet(userId);
```

### User Management (users.gs)

```javascript
// Đăng ký
registerUser({ username, password, email, fullName });

// Đăng nhập
loginUser({ username, password });

// Lấy thông tin user
getUserSession(userId);
```

### User Operations (userOperations.gs)

```javascript
// Profile
getUserProfile(userId);
updateUserProfile(userId, updates);

// Topic Progress
getUserTopicProgress(userId);
updateTopicProgress(userId, progressData);

// Game History
addGameHistory(userId, historyData);
getGameHistory(userId, filters);

// Knowledge Notebook
saveKnowledgeNote(userId, noteData);

// AI Evaluations
saveAIEvaluation(userId, evaluationData);

// Achievements
unlockUserAchievement(userId, achievementData);

// Session Logs
logUserSession(userId, sessionData);
```

---

## Use Cases phổ biến

### 1. User đăng ký mới

```javascript
// Flow tự động:
// 1. registerUser() được gọi
// 2. User được thêm vào MASTER_DB/Users
// 3. createUserPersonalSheet() được gọi tự động
// 4. USER_DB_<userId> được tạo với 7 sheets
// 5. progressSheetId được lưu vào MASTER_DB

const result = registerUser({
  username: "john_doe",
  password: "secure123",
  email: "john@example.com",
  fullName: "John Doe",
});

// result.user.progressSheetId chứa ID của Google Sheet cá nhân
```

### 2. User hoàn thành một quiz

```javascript
function handleQuizComplete(userId, quizData) {
  // 1. Thêm vào game history
  addGameHistory(userId, {
    topicId: quizData.topicId,
    gameType: "mcq",
    questionId: quizData.questionId,
    userAnswer: quizData.answer,
    isCorrect: quizData.isCorrect,
    timeSpent: quizData.timeSpent,
    pointsEarned: quizData.points,
    hintUsed: false,
  });

  // 2. Cập nhật topic progress
  const currentProgress = getUserTopicProgress(userId);
  const topicProgress = currentProgress.find(
    (p) => p.topicId === quizData.topicId
  );

  updateTopicProgress(userId, {
    topicId: quizData.topicId,
    quizDone: (topicProgress?.quizDone || 0) + 1,
    xpEarned: (topicProgress?.xpEarned || 0) + quizData.points,
    accuracy: calculateAccuracy(userId, quizData.topicId),
  });

  // 3. Cập nhật user profile
  const profile = getUserProfile(userId);
  updateUserProfile(userId, {
    totalXP: profile.totalXP + quizData.points,
    totalTimeSpent: profile.totalTimeSpent + quizData.timeSpent,
  });

  // 4. Kiểm tra achievements
  checkAndUnlockAchievements(userId);
}
```

### 3. Lấy dashboard data cho user

```javascript
function getDashboardData(userId) {
  const profile = getUserProfile(userId);
  const topicProgress = getUserTopicProgress(userId);
  const recentHistory = getGameHistory(userId, { limit: 10 });

  return {
    profile: profile,
    progress: topicProgress,
    recentGames: recentHistory,
    stats: {
      totalGames: recentHistory.length,
      averageScore: calculateAverageScore(recentHistory),
      streak: profile.currentStreak,
    },
  };
}
```

### 4. AI đánh giá và đề xuất

```javascript
function evaluateUserPerformance(userId, topicId) {
  // Lấy game history của topic này
  const history = getGameHistory(userId, { topicId: topicId });

  // Tính toán các metrics
  const accuracy = calculateAccuracy(history);
  const speed = calculateSpeed(history);
  const consistency = calculateConsistency(history);

  // AI logic
  const finalScore = accuracy * 0.4 + speed * 0.3 + consistency * 0.3;
  const estimatedLevel = Math.ceil(finalScore / 10);

  // Lưu evaluation
  saveAIEvaluation(userId, {
    topicId: topicId,
    accuracyScore: accuracy,
    speedScore: speed,
    consistencyScore: consistency,
    finalScore: finalScore,
    estimatedLevel: estimatedLevel,
    strengths: determineStrengths(history),
    weaknesses: determineWeaknesses(history),
    recommendNextTopic: recommendTopic(estimatedLevel),
  });

  // Cập nhật user AI level
  updateUserProfile(userId, {
    aiLevel: estimatedLevel,
  });

  return {
    score: finalScore,
    level: estimatedLevel,
    nextTopic: recommendTopic(estimatedLevel),
  };
}
```

---

## Testing Checklist

### ✅ Database Setup

- [ ] MASTER_DB được tạo thành công
- [ ] Tất cả 9 sheets có trong MASTER_DB
- [ ] Headers đúng với schema

### ✅ User Registration

- [ ] User được thêm vào MASTER_DB/Users
- [ ] USER*DB*<userId> được tạo
- [ ] progressSheetId được lưu vào Users
- [ ] USER_DB có đủ 7 sheets
- [ ] Profile được khởi tạo với dữ liệu đúng

### ✅ User Operations

- [ ] getUserProfile() trả về đúng data
- [ ] updateUserProfile() cập nhật thành công
- [ ] addGameHistory() thêm record mới
- [ ] updateTopicProgress() update hoặc insert đúng
- [ ] saveKnowledgeNote() lưu note thành công

### ✅ Data Flow

- [ ] Quiz complete → cập nhật game history
- [ ] Quiz complete → cập nhật topic progress
- [ ] Quiz complete → cập nhật user profile (XP, time)
- [ ] AI evaluation → cập nhật AI level

---

## Common Issues & Solutions

### Issue 1: "Users sheet not found"

**Solution:** Chạy `createAllSheets()` để tạo MASTER_DB

### Issue 2: "progressSheetId is empty"

**Solution:** User chưa có USER_DB. Chạy:

```javascript
const userId = "USR001";
const username = "username";
const sheetId = createUserPersonalSheet(userId, username);
```

### Issue 3: "Cannot read property of undefined"

**Solution:** Kiểm tra column names trong schema có khớp với code không

### Issue 4: "Quota exceeded"

**Solution:**

- Google giới hạn 250 files/ngày
- Nếu tạo nhiều users, chia batch
- Thêm delay: `Utilities.sleep(2000)`

---

## Best Practices

### 1. Error Handling

Luôn wrap operations trong try-catch:

```javascript
try {
  const result = addGameHistory(userId, data);
  if (!result) {
    Logger.log("Failed to add game history");
    // Handle error
  }
} catch (error) {
  Logger.log("Error: " + error.toString());
  // Log to Error_Logs sheet
}
```

### 2. Validation

Validate input trước khi lưu:

```javascript
function validateGameHistory(data) {
  if (!data.userId) return false;
  if (!data.topicId) return false;
  if (!data.gameType) return false;
  return true;
}
```

### 3. Performance

- Cache spreadsheet objects khi có thể
- Batch operations thay vì multiple single operations
- Sử dụng `getDataRange()` thay vì `getRange()` nhiều lần

### 4. Security

- Validate userId từ session
- Không expose progressSheetId ra client
- Check permissions trước khi access USER_DB

---

## Next Steps

1. ✅ **Setup Complete** → Test basic flows
2. 📊 **Add Sample Data** → Test với dữ liệu thực
3. 🎮 **Implement Game Logic** → MCQ, Matching, Challenges
4. 🤖 **Build AI System** → Evaluation & Recommendation
5. 🏆 **Add Gamification** → Achievements, Leaderboard
6. 📱 **Build UI** → Dashboard, Progress tracking

---

## Resources

- [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md) - Chi tiết đầy đủ về schema
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Hướng dẫn migrate từ version cũ
- Google Apps Script Documentation
- Google Sheets API Documentation
