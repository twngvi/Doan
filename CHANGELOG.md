# Changelog - Doanv3 Database Restructure

## [3.0.0] - 2025-11-30

### 🎉 Major Changes - Database Restructure

#### Added - MASTER_DB

- ✅ **Users Sheet**: Thêm columns mới

  - `level` - Level của user (1-100)
  - `totalXP` - Tổng điểm kinh nghiệm
  - `mountainStage` - Giai đoạn leo núi (1-100)
  - `mountainProgress` - % tiến độ trong stage
  - `aiLevel` - Cấp độ AI ước tính (1-10)
  - `progressSheetId` - **Link đến Google Sheet cá nhân**

- ✅ **Topics Sheet**: Thêm columns mới

  - `journey` - Hành trình (Beginner, Intermediate, Advanced)
  - `orderIndex` - Thứ tự hiển thị
  - `totalStages` - Tổng số stage
  - `minAILevel` - Yêu cầu AI level tối thiểu
  - `minAccuracy` - Yêu cầu độ chính xác tối thiểu
  - `createdAt` - Thời gian tạo

- ✅ **Matching_Pairs Sheet**: Thêm columns mới

  - `explanation` - Giải thích
  - `points` - Điểm thưởng

- ✅ **Mini_Challenges Sheet** - Mới hoàn toàn

  - Hỗ trợ đa dạng loại challenges
  - JSON content cho flexibility
  - Difficulty levels
  - Points system

- ✅ **Achievements Sheet** - Mới hoàn toàn

  - Achievement definitions
  - Condition JSON
  - Icons & points
  - Unlockable system

- ✅ **Leaderboard Sheet** - Mới hoàn toàn

  - Global ranking
  - Real-time updates
  - Multiple metrics (XP, stage, AI level)

- ✅ **Error_Logs Sheet** - Tách riêng từ Logs
  - Detailed error tracking
  - Stack traces
  - Performance metrics

#### Added - USER_DB (Personal Sheets)

- ✅ **Profile Sheet**

  - User stats tổng quan
  - Level, XP, AI level
  - Streak tracking
  - Time spent tracking

- ✅ **Topic_Progress Sheet**

  - Chi tiết tiến độ từng topic
  - Quiz/Matching/Challenge counters
  - Accuracy metrics
  - AI decisions & scores
  - Status tracking (locked/unlocked/in_progress/completed)

- ✅ **Game_History Sheet**

  - Lịch sử chơi game chi tiết
  - Question-level tracking
  - Time spent per question
  - Hint usage tracking

- ✅ **Knowledge_Notebook Sheet**

  - Personal notes
  - Tagging system
  - Reference to questions/topics

- ✅ **AI_Evaluations Sheet**

  - Detailed AI assessments
  - Multiple score dimensions
  - Strengths & weaknesses analysis
  - Topic recommendations

- ✅ **Achievements Sheet (Personal)**

  - User's unlocked achievements
  - Unlock timestamps
  - Points earned

- ✅ **Session_Logs Sheet**
  - Login/logout tracking
  - Device information
  - IP tracking

#### Modified - Code Files

**config/schema.js**

- ✅ Cập nhật `DB_CONFIG` với schema mới
- ✅ Thêm `USER_DB_CONFIG` cho personal sheets
- ✅ Thêm `createUserPersonalSheet()` function
- ✅ Thêm `findUserProgressSheet()` function
- ✅ Thêm `getUserSpreadsheet()` function
- ✅ Thêm `initializeUserProfile()` function
- ✅ Thêm `updateUserProgressSheetId()` function

**server/users.gs**

- ✅ Cập nhật `registerUser()` để tương thích schema mới
- ✅ Tự động tạo USER_DB khi đăng ký
- ✅ Cập nhật `loginUser()` để trả về progressSheetId
- ✅ Comment out old functions, sử dụng functions từ schema.js

**services/authService.js**

- ✅ Cập nhật `registerWithEmail()` với schema mới
- ✅ Loại bỏ các fields không cần thiết (passwordHash sẽ xử lý riêng)
- ✅ Khởi tạo user với giá trị mặc định (level=1, totalXP=0, etc.)

**server/userOperations.gs** - Mới hoàn toàn

- ✅ `getUserProfile()` & `updateUserProfile()`
- ✅ `getUserTopicProgress()` & `updateTopicProgress()`
- ✅ `addGameHistory()` & `getGameHistory()`
- ✅ `saveKnowledgeNote()`
- ✅ `saveAIEvaluation()`
- ✅ `unlockUserAchievement()`
- ✅ `logUserSession()`

#### Added - Documentation

**docs/DATABASE_STRUCTURE.md** - Mới

- ✅ Chi tiết đầy đủ về MASTER_DB structure
- ✅ Chi tiết đầy đủ về USER_DB structure
- ✅ Ví dụ sử dụng
- ✅ Best practices

**docs/MIGRATION_GUIDE.md** - Mới

- ✅ Hướng dẫn backup
- ✅ Migration scripts đầy đủ
- ✅ Verification scripts
- ✅ Rollback instructions

**docs/QUICK_START.md** - Mới

- ✅ Setup instructions
- ✅ Common use cases
- ✅ Testing checklist
- ✅ Troubleshooting guide

**docs/SUMMARY.md** - Mới

- ✅ Tóm tắt thay đổi
- ✅ Architecture overview
- ✅ Key concepts
- ✅ Feature roadmap

#### Updated - README.md

- ✅ Cập nhật architecture diagram
- ✅ Thêm database structure overview
- ✅ Thêm quick start section
- ✅ Links đến documentation

#### Removed

- ❌ `passwordHash` từ Users (sẽ xử lý riêng hoặc external)
- ❌ `fullName` từ Users (chuyển vào USER_DB Profile)
- ❌ `emailVerified`, `verificationToken`, `resetPasswordToken` (đơn giản hóa)

---

## Migration Path

### From v2.x to v3.0.0

```javascript
// 1. Backup
backupOldDatabase();

// 2. Migrate data
migrateUsersData();
migrateTopicsData();

// 3. Create new sheets
createNewSheets();

// 4. Create USER_DB for existing users
createUserDBForExistingUsers();

// 5. Verify
verifyMigration();
```

**⚠️ Breaking Changes:**

- Users sheet structure đã thay đổi đáng kể
- Topic Progress không còn trong MASTER_DB
- Cần chạy migration script cho users hiện có

---

## Performance Improvements

- ✅ **Faster queries**: Mỗi USER_DB có ít rows hơn
- ✅ **Parallel processing**: Nhiều users có thể update cùng lúc
- ✅ **Scalability**: Không giới hạn số lượng users
- ✅ **Reduced conflicts**: Tách biệt dữ liệu giữa users

---

## Security Enhancements

- ✅ **Data isolation**: Mỗi user có spreadsheet riêng
- ✅ **Privacy**: User data không visible cho users khác
- ✅ **Access control**: Có thể share USER_DB trực tiếp cho user

---

## Future Considerations (v3.1.0+)

### Planned Features

- [ ] Password encryption & authentication table
- [ ] Social features (friends, groups)
- [ ] Custom challenges creation
- [ ] Export/import user data
- [ ] Mobile app API
- [ ] Real-time notifications
- [ ] Analytics dashboard for admins
- [ ] Batch operations API
- [ ] Webhook integrations

### Technical Debt

- [ ] Add comprehensive unit tests
- [ ] Set up CI/CD pipeline
- [ ] Add rate limiting
- [ ] Implement caching layer
- [ ] Add API versioning
- [ ] Create admin UI for MASTER_DB management

---

## Contributors

- Initial restructure: GitHub Copilot
- Date: 2025-11-30
- Version: 3.0.0

---

## Notes

This is a **major breaking change** that requires migration for existing installations.

For fresh installations, simply run `createAllSheets()` to get started.

For existing installations, follow the [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) carefully.

---

## Support

If you encounter issues during migration:

1. Check logs in MASTER_DB/Error_Logs
2. Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
3. Contact development team

**Always backup before migration!**
