# Migration Guide - Cập nhật cấu trúc Database mới

## Tổng quan thay đổi

Hệ thống được cấu trúc lại với 2 loại Google Sheets:

- **MASTER_DB**: Database tổng (trước đây là DB_Master)
- **USER*DB*<userId>**: Database cá nhân cho từng user (mới)

---

## Các thay đổi chính

### 1. MASTER_DB (DB_Master → MASTER_DB)

#### Users Sheet

**Thêm mới:**

- `level` - Level của user
- `totalXP` - Tổng điểm kinh nghiệm
- `mountainStage` - Giai đoạn leo núi
- `mountainProgress` - % tiến độ
- `aiLevel` - Cấp độ AI
- `progressSheetId` - **Quan trọng**: Link đến Google Sheet cá nhân

**Xóa bỏ:**

- `passwordHash` - Chuyển sang auth riêng hoặc external
- `fullName` - Chuyển vào USER_DB Profile
- `emailVerified` - Đơn giản hóa
- `verificationToken` - Đơn giản hóa
- `resetPasswordToken` - Đơn giản hóa

#### Topics Sheet

**Thêm mới:**

- `journey` - Hành trình học tập
- `orderIndex` - Thứ tự hiển thị
- `totalStages` - Tổng số stage
- `minAILevel` - Yêu cầu AI level
- `minAccuracy` - Yêu cầu độ chính xác
- `createdAt` - Thời gian tạo

#### MCQ_Questions Sheet

**Không thay đổi** - Giữ nguyên cấu trúc

#### Matching_Pairs Sheet

**Thêm mới:**

- `explanation` - Giải thích
- `points` - Điểm thưởng

#### Sheets mới

- **Mini_Challenges** - Thử thách mini đa dạng
- **Achievements** - Hệ thống thành tựu
- **Leaderboard** - Bảng xếp hạng
- **Error_Logs** - Log lỗi riêng

### 2. USER_DB - Google Sheet cá nhân (MỚI)

Mỗi user giờ có 1 Google Sheet riêng với 7 sheets:

1. **Profile** - Thông tin cá nhân
2. **Topic_Progress** - Tiến trình học tập
3. **Game_History** - Lịch sử chơi game
4. **Knowledge_Notebook** - Sổ ghi chú
5. **AI_Evaluations** - Đánh giá AI
6. **Achievements** - Thành tựu đã đạt
7. **Session_Logs** - Log phiên đăng nhập

---

## Hướng dẫn Migration

### Bước 1: Backup Database cũ

```javascript
function backupOldDatabase() {
  // Tìm DB_Master cũ
  const files = DriveApp.getFilesByName("DB_Master");
  if (files.hasNext()) {
    const file = files.next();

    // Copy file
    const backup = file.makeCopy(
      "DB_Master_BACKUP_" + new Date().toISOString()
    );
    Logger.log("Backup created: " + backup.getId());
    return backup.getId();
  }
}
```

### Bước 2: Cập nhật schema

```javascript
// Chạy function này để update schema
function updateDatabaseSchema() {
  updateAllSheetsSchema();
}
```

### Bước 3: Migrate dữ liệu Users

```javascript
function migrateUsersData() {
  const ss = getOrCreateDatabase();
  const usersSheet = ss.getSheetByName("Users");

  if (!usersSheet) {
    Logger.log("Users sheet not found");
    return;
  }

  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];

  // Tìm index của các cột cũ
  const userIdIndex = headers.indexOf("userId");
  const usernameIndex = headers.indexOf("username");

  // Thêm các cột mới nếu chưa có
  const requiredColumns = [
    "level",
    "totalXP",
    "mountainStage",
    "mountainProgress",
    "aiLevel",
    "progressSheetId",
  ];

  requiredColumns.forEach((col) => {
    if (headers.indexOf(col) === -1) {
      // Thêm cột mới
      const newColIndex = headers.length;
      usersSheet.getRange(1, newColIndex + 1).setValue(col);

      // Set giá trị mặc định cho tất cả users
      for (let i = 2; i <= data.length; i++) {
        let defaultValue;
        switch (col) {
          case "level":
            defaultValue = 1;
            break;
          case "totalXP":
            defaultValue = 0;
            break;
          case "mountainStage":
            defaultValue = 1;
            break;
          case "mountainProgress":
            defaultValue = 0;
            break;
          case "aiLevel":
            defaultValue = 1;
            break;
          case "progressSheetId":
            defaultValue = "";
            break;
        }
        usersSheet.getRange(i, newColIndex + 1).setValue(defaultValue);
      }
    }
  });

  Logger.log("✅ Users data migrated");
}
```

### Bước 4: Tạo USER_DB cho users hiện có

```javascript
function createUserDBForExistingUsers() {
  const ss = getOrCreateDatabase();
  const usersSheet = ss.getSheetByName("Users");

  if (!usersSheet) {
    Logger.log("Users sheet not found");
    return;
  }

  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];

  const userIdIndex = headers.indexOf("userId");
  const usernameIndex = headers.indexOf("username");
  const progressSheetIdIndex = headers.indexOf("progressSheetId");

  let created = 0;
  let skipped = 0;

  // Bỏ qua header row
  for (let i = 1; i < data.length; i++) {
    const userId = data[i][userIdIndex];
    const username = data[i][usernameIndex];
    const existingSheetId = data[i][progressSheetIdIndex];

    // Chỉ tạo nếu chưa có progressSheetId
    if (!existingSheetId) {
      try {
        Logger.log("Creating USER_DB for: " + userId);
        const sheetId = createUserPersonalSheet(userId, username);
        Logger.log("Created: " + sheetId);
        created++;

        // Delay để tránh quota limits
        Utilities.sleep(2000);
      } catch (error) {
        Logger.log(
          "Error creating sheet for " + userId + ": " + error.toString()
        );
      }
    } else {
      skipped++;
    }
  }

  Logger.log("✅ Migration complete!");
  Logger.log("Created: " + created);
  Logger.log("Skipped: " + skipped);
}
```

### Bước 5: Migrate Topics

```javascript
function migrateTopicsData() {
  const ss = getOrCreateDatabase();
  const topicsSheet = ss.getSheetByName("Topics");

  if (!topicsSheet) {
    Logger.log("Topics sheet not found");
    return;
  }

  const data = topicsSheet.getDataRange().getValues();
  const headers = data[0];

  // Thêm các cột mới
  const newColumns = [
    "journey",
    "orderIndex",
    "totalStages",
    "minAILevel",
    "minAccuracy",
    "createdAt",
  ];

  newColumns.forEach((col) => {
    if (headers.indexOf(col) === -1) {
      const newColIndex = headers.length;
      topicsSheet.getRange(1, newColIndex + 1).setValue(col);

      // Set giá trị mặc định
      for (let i = 2; i <= data.length; i++) {
        let defaultValue;
        switch (col) {
          case "journey":
            defaultValue = "Beginner";
            break;
          case "orderIndex":
            defaultValue = i - 1;
            break;
          case "totalStages":
            defaultValue = 10;
            break;
          case "minAILevel":
            defaultValue = 1;
            break;
          case "minAccuracy":
            defaultValue = 0;
            break;
          case "createdAt":
            defaultValue = new Date();
            break;
        }
        topicsSheet.getRange(i, newColIndex + 1).setValue(defaultValue);
      }
    }
  });

  Logger.log("✅ Topics data migrated");
}
```

### Bước 6: Tạo các sheets mới

```javascript
function createNewSheets() {
  const ss = getOrCreateDatabase();

  // Tạo Mini_Challenges
  if (!ss.getSheetByName("Mini_Challenges")) {
    const sheetConfig = DB_CONFIG.SHEETS.MINI_CHALLENGES;
    createSheet(ss, sheetConfig);
    Logger.log("✅ Created Mini_Challenges");
  }

  // Tạo Achievements
  if (!ss.getSheetByName("Achievements")) {
    const sheetConfig = DB_CONFIG.SHEETS.ACHIEVEMENTS;
    createSheet(ss, sheetConfig);
    Logger.log("✅ Created Achievements");
  }

  // Tạo Leaderboard
  if (!ss.getSheetByName("Leaderboard")) {
    const sheetConfig = DB_CONFIG.SHEETS.LEADERBOARD;
    createSheet(ss, sheetConfig);
    Logger.log("✅ Created Leaderboard");
  }

  // Tạo Error_Logs
  if (!ss.getSheetByName("Error_Logs")) {
    const sheetConfig = DB_CONFIG.SHEETS.ERROR_LOGS;
    createSheet(ss, sheetConfig);
    Logger.log("✅ Created Error_Logs");
  }
}
```

---

## Chạy Migration đầy đủ

```javascript
function runFullMigration() {
  try {
    Logger.log("=== BẮT ĐẦU MIGRATION ===");

    // Step 1: Backup
    Logger.log("Step 1: Backup database...");
    const backupId = backupOldDatabase();
    Logger.log("Backup ID: " + backupId);

    // Step 2: Update schema
    Logger.log("Step 2: Update schema...");
    migrateUsersData();
    migrateTopicsData();

    // Step 3: Create new sheets
    Logger.log("Step 3: Create new sheets...");
    createNewSheets();

    // Step 4: Create USER_DB for existing users
    Logger.log("Step 4: Create USER_DB for existing users...");
    Logger.log("⚠️ This may take a while...");
    createUserDBForExistingUsers();

    Logger.log("=== HOÀN THÀNH MIGRATION ===");
    return {
      success: true,
      message: "Migration completed successfully!",
    };
  } catch (error) {
    Logger.log("❌ Migration failed: " + error.toString());
    return {
      success: false,
      message: "Migration failed: " + error.toString(),
    };
  }
}
```

---

## Kiểm tra sau Migration

```javascript
function verifyMigration() {
  const ss = getOrCreateDatabase();
  const usersSheet = ss.getSheetByName("Users");

  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];

  Logger.log("=== VERIFICATION REPORT ===");
  Logger.log("Total users: " + (data.length - 1));

  // Kiểm tra Users sheet có đủ columns không
  const requiredColumns = [
    "userId",
    "username",
    "email",
    "googleId",
    "avatarUrl",
    "role",
    "level",
    "totalXP",
    "mountainStage",
    "mountainProgress",
    "aiLevel",
    "progressSheetId",
    "createdAt",
    "lastLogin",
    "isActive",
  ];

  const missingColumns = [];
  requiredColumns.forEach((col) => {
    if (headers.indexOf(col) === -1) {
      missingColumns.push(col);
    }
  });

  if (missingColumns.length > 0) {
    Logger.log("❌ Missing columns: " + missingColumns.join(", "));
  } else {
    Logger.log("✅ All required columns present");
  }

  // Kiểm tra users có progressSheetId không
  const progressSheetIdIndex = headers.indexOf("progressSheetId");
  let usersWithSheet = 0;
  let usersWithoutSheet = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][progressSheetIdIndex]) {
      usersWithSheet++;
    } else {
      usersWithoutSheet++;
    }
  }

  Logger.log("Users with USER_DB: " + usersWithSheet);
  Logger.log("Users without USER_DB: " + usersWithoutSheet);

  // Kiểm tra các sheets mới
  const newSheets = [
    "Mini_Challenges",
    "Achievements",
    "Leaderboard",
    "Error_Logs",
  ];
  newSheets.forEach((sheetName) => {
    if (ss.getSheetByName(sheetName)) {
      Logger.log("✅ " + sheetName + " exists");
    } else {
      Logger.log("❌ " + sheetName + " missing");
    }
  });

  Logger.log("=== END VERIFICATION ===");
}
```

---

## Rollback (Nếu cần)

```javascript
function rollbackMigration(backupId) {
  try {
    Logger.log("=== ROLLBACK MIGRATION ===");

    // Mở backup file
    const backupFile = DriveApp.getFileById(backupId);
    const backupSS = SpreadsheetApp.openById(backupId);

    // Rename current DB_Master
    const currentFiles = DriveApp.getFilesByName("MASTER_DB");
    if (currentFiles.hasNext()) {
      const currentFile = currentFiles.next();
      currentFile.setName("MASTER_DB_FAILED_" + new Date().toISOString());
    }

    // Rename backup to DB_Master
    backupFile.setName("MASTER_DB");

    Logger.log("✅ Rollback completed");
    Logger.log("Backup restored as MASTER_DB");
  } catch (error) {
    Logger.log("❌ Rollback failed: " + error.toString());
  }
}
```

---

## Lưu ý quan trọng

⚠️ **Trước khi chạy migration:**

1. Backup database cũ
2. Test trên database test trước
3. Chạy trong giờ thấp điểm
4. Theo dõi quota limits của Google

⚠️ **Sau khi migration:**

1. Chạy function `verifyMigration()` để kiểm tra
2. Test login/register flow
3. Test tạo USER_DB mới
4. Kiểm tra user hiện có có access được USER_DB không

⚠️ **Google Quota Limits:**

- Tạo file: 250/ngày
- Script runtime: 6 phút/execution
- Nếu có nhiều users, chia batch và chạy nhiều lần
