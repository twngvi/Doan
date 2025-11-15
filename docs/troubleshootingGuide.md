# 🔧 Hướng Dẫn Fix Lỗi Tạo Google Sheets Cho User

## 🚨 Vấn đề thường gặp và cách khắc phục

### 1. **"Insufficient Permission" Error**

```
❌ User does not have permission to create files in Drive
```

**Nguyên nhân:**

- Apps Script chưa được cấp quyền Drive API
- Token authorization hết hạn

**Cách fix:**

```javascript
// Bước 1: Chạy diagnostic
runSystemDiagnostics();

// Bước 2: Re-authorize nếu cần
// Trong Apps Script Editor: Run any function → Allow permissions
```

### 2. **"Request timeout" Error**

```
❌ Spreadsheet creation timed out
```

**Nguyên nhân:**

- Google servers quá tải
- Rate limiting

**Cách fix:**

```javascript
// Sử dụng improved version với retry logic
testImprovedSheetCreation();

// Hoặc chờ 2-3 phút và thử lại
```

### 3. **"File name already exists"**

```
❌ A file with this name already exists
```

**Nguyên nhân:**

- Duplicate filename trong Drive

**Cách fix:**

- Function improved tự động thêm timestamp
- Hoặc xóa file cũ:

```javascript
// Tìm và xóa file duplicate
const files = DriveApp.getFilesByName("username_Learning_Data");
while (files.hasNext()) {
  files.next().setTrashed(true);
}
```

### 4. **"Cannot find or create user folder"**

```
❌ Failed to create user folder
```

**Cách fix:**

```javascript
// Fix manual folder creation
function fixUserFolder(username) {
  try {
    const folderName = `User_${username}`;
    DriveApp.createFolder(folderName);
    Logger.log("✅ Folder created");
  } catch (error) {
    Logger.log("❌ " + error.toString());
  }
}
```

### 5. **"Sharing failed"**

```
❌ Could not share with admin emails
```

**Cách fix:**

```javascript
// Check admin emails config
Logger.log(ADMIN_CONFIG.ADMIN_EMAILS);

// Manual share
const file = DriveApp.getFileById("SPREADSHEET_ID");
file.addViewer("ttvdoan112233@gmail.com");
```

---

## 🛠️ Quick Diagnostics

### Chạy System Check:

```javascript
function quickSystemCheck() {
  Logger.log("=== QUICK SYSTEM CHECK ===");

  // Check 1: Drive permissions
  try {
    const testFile = DriveApp.createFile("test", "test");
    testFile.setTrashed(true);
    Logger.log("✅ Drive: OK");
  } catch (e) {
    Logger.log("❌ Drive: FAIL - " + e.toString());
  }

  // Check 2: Spreadsheet creation
  try {
    const testSheet = SpreadsheetApp.create("test");
    DriveApp.getFileById(testSheet.getId()).setTrashed(true);
    Logger.log("✅ Spreadsheets: OK");
  } catch (e) {
    Logger.log("❌ Spreadsheets: FAIL - " + e.toString());
  }

  // Check 3: Database access
  try {
    const db = getOrCreateDatabase();
    Logger.log("✅ Database: OK - " + db.getName());
  } catch (e) {
    Logger.log("❌ Database: FAIL - " + e.toString());
  }
}
```

---

## 🔄 Recovery Procedures

### 1. **Fix User Missing Sheets**

```javascript
// Fix một user cụ thể
function fixSpecificUser(email) {
  const db = getOrCreateDatabase();
  const usersSheet = db.getSheetByName("Users");
  const data = usersSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email) {
      // Email column
      const userId = data[i][0];
      const username = data[i][1];

      Logger.log(`🔧 Fixing user: ${username}`);
      const result = createUserProgressSheetsImproved(userId, username, email);

      if (result.success) {
        Logger.log(`✅ Fixed: ${username}`);
      } else {
        Logger.log(`❌ Failed: ${username} - ${result.error}`);
      }
      break;
    }
  }
}
```

### 2. **Batch Fix All Users**

```javascript
// Chạy này để fix hàng loạt
fixAllUsersWithoutSheets();
```

### 3. **Clean Up Broken Files**

```javascript
function cleanupBrokenFiles() {
  // Tìm file có tên pattern của user sheets
  const files = DriveApp.getFiles();
  const brokenFiles = [];

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    if (name.includes("_Learning_Data") || name.includes("_Progress")) {
      try {
        // Test xem file có access được không
        SpreadsheetApp.openById(file.getId()).getName();
      } catch (error) {
        // File bị broken, mark để xóa
        brokenFiles.push({
          name: name,
          id: file.getId(),
          error: error.toString(),
        });
      }
    }
  }

  Logger.log(`Found ${brokenFiles.length} potentially broken files`);
  brokenFiles.forEach((file) => {
    Logger.log(`- ${file.name}: ${file.error}`);
  });

  return brokenFiles;
}
```

---

## ⚡ Emergency Fixes

### 1. **System Down - All Sheet Creation Failing**

```javascript
// Check toàn bộ system health
runSystemDiagnostics();

// Nếu tất cả fail → Google API issue
// Wait 15-30 minutes và thử lại
```

### 2. **Mass User Registration Event**

```javascript
// Disable auto-sheet creation tạm thời
function pauseSheetCreation() {
  // Modify loginWithGoogle to skip sheet creation
  // Process users manually sau đó
}

// Process batch users sau
function processPendingUsers() {
  // Run fixAllUsersWithoutSheets()
}
```

### 3. **Admin Access Lost**

```javascript
function emergencyAdminAccess() {
  const files = DriveApp.getFiles();
  const userSheets = [];

  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().includes("_Learning_Data")) {
      try {
        file.addViewer("ttvdoan112233@gmail.com");
        userSheets.push(file.getName());
      } catch (error) {
        Logger.log(`Failed: ${file.getName()}`);
      }
    }
  }

  Logger.log(`✅ Fixed admin access for ${userSheets.length} sheets`);
}
```

---

## 📊 Monitoring & Prevention

### 1. **Daily Health Check** (Schedule this)

```javascript
function dailyHealthCheck() {
  const report = runSystemDiagnostics();

  if (!report.healthy) {
    // Send alert email hoặc log warning
    Logger.log("🚨 SYSTEM HEALTH ALERT");

    // Auto-fix common issues
    if (report.failed > 0) {
      // Try common fixes
      fixAllUsersWithoutSheets();
    }
  }
}
```

### 2. **Error Monitoring**

```javascript
// Check Error_Logs sheet hàng ngày
function checkErrorLogs() {
  try {
    const db = getOrCreateDatabase();
    const errorSheet = db.getSheetByName("Error_Logs");

    if (errorSheet) {
      const today = new Date();
      const data = errorSheet.getDataRange().getValues();
      let todayErrors = 0;

      for (let i = 1; i < data.length; i++) {
        const errorDate = new Date(data[i][0]);
        if (errorDate.toDateString() === today.toDateString()) {
          todayErrors++;
        }
      }

      Logger.log(`📊 Today's errors: ${todayErrors}`);

      if (todayErrors > 10) {
        Logger.log("🚨 HIGH ERROR RATE - Investigate required");
      }
    }
  } catch (error) {
    Logger.log("❌ Could not check error logs: " + error.toString());
  }
}
```

---

## 📞 Escalation Path

### Level 1: Self-Service

1. Chạy `runSystemDiagnostics()`
2. Chạy `testImprovedSheetCreation()`
3. Check Error_Logs sheet

### Level 2: Manual Intervention

1. `fixAllUsersWithoutSheets()`
2. `emergencyAdminAccess()`
3. Check Google Apps Script quotas

### Level 3: Contact Admin

- Email: ttvdoan112233@gmail.com
- Include: Error logs, diagnostic results, user details

---

## 🎯 Success Metrics

**Target Performance:**

- ✅ Sheet creation success rate: >95%
- ✅ Average creation time: <10 seconds
- ✅ Admin sharing success: >98%
- ✅ System uptime: >99%

**Monitor these daily:**

- Error_Logs sheet entry count
- Users without spreadsheetId
- Failed admin sharing attempts

---

## 🔧 Tools Quick Reference

| Problem            | Tool       | Command                               |
| ------------------ | ---------- | ------------------------------------- |
| System health      | Diagnostic | `runSystemDiagnostics()`              |
| Test creation      | Test       | `testImprovedSheetCreation()`         |
| Fix one user       | Recovery   | `fixSpecificUser('email@domain.com')` |
| Fix all users      | Batch      | `fixAllUsersWithoutSheets()`          |
| Clean broken files | Cleanup    | `cleanupBrokenFiles()`                |
| Check errors       | Monitor    | `checkErrorLogs()`                    |
| Admin access       | Emergency  | `emergencyAdminAccess()`              |

**Remember:** Always run diagnostics first, then use appropriate fix tools! 🚀
