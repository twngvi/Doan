/**
 * masterDb.js - Master Database Management
 *
 * Chứa các hàm quản lý MASTER_DB: get/create database, create sheets, schema management
 */

/**
 * Get or create database spreadsheet
 */
function getOrCreateDatabase() {
  try {
    const cache = CacheService.getScriptCache();

    // Priority 1: Use hard-coded ID from config
    if (DB_CONFIG.SPREADSHEET_ID) {
      try {
        const ss = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
        Logger.log("Using hard-coded database ID: " + DB_CONFIG.SPREADSHEET_ID);
        return ss;
      } catch (e) {
        Logger.log(
          "Hard-coded ID failed, falling back to search: " + e.toString()
        );
      }
    }

    // Priority 2: Check cache
    const cachedId = cache.get("DB_MASTER_ID");

    let ss;

    if (cachedId) {
      try {
        ss = SpreadsheetApp.openById(cachedId);
        Logger.log("Found database from cache: " + cachedId);
        return ss;
      } catch (e) {
        Logger.log("Cached ID invalid, searching again...");
        cache.remove("DB_MASTER_ID");
      }
    }

    // Priority 3: Search by name
    const files = DriveApp.getFilesByName(DB_CONFIG.SPREADSHEET_NAME);

    if (files.hasNext()) {
      const file = files.next();
      ss = SpreadsheetApp.openById(file.getId());
      Logger.log("Found existing database: " + ss.getId());
      cache.put("DB_MASTER_ID", ss.getId(), 21600);
    } else {
      ss = SpreadsheetApp.create(DB_CONFIG.SPREADSHEET_NAME);
      Logger.log("Created new database: " + ss.getId());
      cache.put("DB_MASTER_ID", ss.getId(), 21600);
    }

    // Ensure Users sheet exists
    let usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      Logger.log("Initializing database...");
      createAllSheets();
    }

    return ss;
  } catch (error) {
    Logger.log("Error getting/creating database: " + error.toString());
    throw new Error(
      "Không thể tạo hoặc truy cập database: " + error.toString()
    );
  }
}

/**
 * Get sheet by name
 */
function getSheet(sheetName) {
  try {
    const ss = getOrCreateDatabase();
    return ss.getSheetByName(sheetName);
  } catch (error) {
    Logger.log("Error getting sheet " + sheetName + ": " + error.toString());
    return null;
  }
}

/**
 * Create all sheets according to schema
 */
function createAllSheets() {
  try {
    const spreadsheet = getOrCreateDatabase();

    // Delete default sheet if exists
    const defaultSheet = spreadsheet.getSheetByName("Sheet1");
    if (defaultSheet && spreadsheet.getSheets().length > 1) {
      spreadsheet.deleteSheet(defaultSheet);
    }

    // Create each sheet
    Object.values(DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      createSheet(spreadsheet, sheetConfig);
    });

    Logger.log("All sheets created successfully!");
    return spreadsheet.getUrl();
  } catch (error) {
    Logger.log("Error creating sheets: " + error.toString());
    throw error;
  }
}

/**
 * Create a single sheet with headers
 */
function createSheet(spreadsheet, sheetConfig) {
  try {
    let sheet = spreadsheet.getSheetByName(sheetConfig.name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetConfig.name);
      Logger.log("Created sheet: " + sheetConfig.name);
    } else {
      Logger.log("Sheet already exists: " + sheetConfig.name);
      updateSheetSchema(sheet, sheetConfig);
      return sheet;
    }

    // Add header row
    const headerRange = sheet.getRange(1, 1, 1, sheetConfig.columns.length);
    headerRange.setValues([sheetConfig.columns]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");

    sheet.autoResizeColumns(1, sheetConfig.columns.length);
    sheet.setFrozenRows(1);

    return sheet;
  } catch (error) {
    Logger.log(
      "Error creating sheet " + sheetConfig.name + ": " + error.toString()
    );
    throw error;
  }
}

/**
 * Update sheet schema
 */
function updateSheetSchema(sheet, sheetConfig) {
  try {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) {
      const headerRange = sheet.getRange(1, 1, 1, sheetConfig.columns.length);
      headerRange.setValues([sheetConfig.columns]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("white");
      sheet.setFrozenRows(1);
      return;
    }

    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const newColumns = sheetConfig.columns;

    if (currentHeaders.length < newColumns.length) {
      Logger.log("Updating schema for " + sheetConfig.name);
      const headerRange = sheet.getRange(1, 1, 1, newColumns.length);
      headerRange.setValues([newColumns]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("white");
      Logger.log("Schema updated for " + sheetConfig.name);
    }
  } catch (error) {
    Logger.log(
      "Error updating schema for " + sheetConfig.name + ": " + error.toString()
    );
  }
}

/**
 * Initialize database (for setup/testing)
 */
function initializeDatabase() {
  try {
    Logger.log("=== INITIALIZE DATABASE ===");
    const url = createAllSheets();
    Logger.log("Database created successfully!");
    Logger.log("URL: " + url);
    return {
      success: true,
      message: "Database đã được tạo thành công!",
      url: url,
    };
  } catch (error) {
    Logger.log("Error initializing database: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Hàm tạo Google Sheet cá nhân cho User
 * và lưu vào folder chỉ định
 */
function createUserPersonalSheet(email, displayName) {
  // Folder ID bạn cung cấp
  const TARGET_FOLDER_ID = "1dlc7DeSDw19J9_38E8cJvV5hNeopO3oS"; 
  
  // 1. Tạo Spreadsheet mới trong root
  const sheetName = `UserDB_${displayName}_${email}`;
  const ss = SpreadsheetApp.create(sheetName);
  const ssId = ss.getId();
  
  // 2. Di chuyển vào Folder chỉ định
  const file = DriveApp.getFileById(ssId);
  const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  file.moveTo(folder);
  
  // 3. Tạo cấu trúc các sheet con bên trong (dựa theo USER_DB_CONFIG trong schemas.js)
  // Xóa sheet mặc định
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet) ss.deleteSheet(defaultSheet);
  
  // Duyệt qua config để tạo sheet
  if (typeof USER_DB_CONFIG !== 'undefined' && USER_DB_CONFIG.SHEETS) {
    Object.values(USER_DB_CONFIG.SHEETS).forEach(sheetConfig => {
      const newSheet = ss.insertSheet(sheetConfig.name);
      // Tạo header
      const headerRange = newSheet.getRange(1, 1, 1, sheetConfig.columns.length);
      headerRange.setValues([sheetConfig.columns]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#e6f2ff"); // Màu xanh nhạt cho user db
    });
  }
  
  return ssId;
}

/**
 * Process Google OAuth User Login
 * - Tạo/Cập nhật User trong DB Users
 * - Tự động tạo Sheet cá nhân nếu chưa có
 */
function processGoogleUserLogin(googleProfile) {
  const ss = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
  const userSheet = ss.getSheetByName(DB_CONFIG.SHEETS.USERS.name);
  // Lấy toàn bộ dữ liệu (cân nhắc tối ưu nếu data lớn, hiện tại dùng cách này cho đơn giản)
  const data = userSheet.getDataRange().getValues();
  
  const email = googleProfile.email;
  const googleId = googleProfile.id;
  const avatar = googleProfile.picture;
  const name = googleProfile.name;
  
  let userRowIndex = -1;
  let existingUser = null;
  // Cột progressSheetId nằm ở index 24 (theo schemas.js)
  const PROGRESS_SHEET_COL_INDEX = 24;

  // 1. Tìm User
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email) { // Col 2 là email
      userRowIndex = i + 1;
      existingUser = data[i];
      break;
    }
  }

  // 2. Chuẩn bị thông tin Sheet cá nhân (Nếu chưa có)
  let progressSheetId = existingUser ? existingUser[PROGRESS_SHEET_COL_INDEX] : "";

  // Nếu chưa có sheet cá nhân, tạo mới ngay lập tức
  if (!progressSheetId) {
    try {
      progressSheetId = createUserPersonalSheet(email, name);
      Logger.log("Created new personal sheet for " + email + ": " + progressSheetId);
    } catch (e) {
      Logger.log("Error creating personal sheet: " + e.toString());
    }
  }

  if (existingUser) {
    // === CẬP NHẬT USER CŨ ===
    userSheet.getRange(userRowIndex, 2).setValue(googleId); // Update Google ID
    userSheet.getRange(userRowIndex, 7).setValue(avatar);   // Update Avatar
    userSheet.getRange(userRowIndex, 16).setValue(new Date()); // Last Login
    
    // ⭐ Update progressSheetId nếu lúc trước chưa có mà giờ mới tạo
    if (!existingUser[PROGRESS_SHEET_COL_INDEX] && progressSheetId) {
       userSheet.getRange(userRowIndex, PROGRESS_SHEET_COL_INDEX + 1).setValue(progressSheetId);
    }

    return {
      userId: existingUser[0],
      email: existingUser[2],
      displayName: existingUser[3],
      avatarUrl: avatar,
      role: existingUser[7],
      level: existingUser[8],
      progressSheetId: progressSheetId, // Trả về ID sheet
      status: "success"
    };
  } else {
    // === USER MỚI: Tạo dòng mới ===
    const newUserId = "USR_" + new Date().getTime();
    const now = new Date();
    
    // Mảng dữ liệu khớp 100% với thứ tự cột trong DB_CONFIG.SHEETS.USERS.columns
    const newRow = [
      newUserId,            // 0: userId
      googleId,             // 1: googleId
      email,                // 2: email
      name,                 // 3: displayName
      email.split('@')[0],  // 4: username
      "GOOGLE_OAUTH",       // 5: passwordHash
      avatar,               // 6: avatarUrl
      "USER",               // 7: role
      1,                    // 8: level
      1,                    // 9: aiLevel
      0,                    // 10: totalPoints
      0,                    // 11: totalXP
      0,                    // 12: currentStreak
      0,                    // 13: longestStreak
      now,                  // 14: lastActiveDate
      now,                  // 15: lastLogin
      now,                  // 16: createdAt
      true,                 // 17: isActive
      0,                    // 18: mountainPosition
      1,                    // 19: mountainStage
      0,                    // 20: mountainProgress
      0,                    // 21: totalQuizAnswered
      0,                    // 22: totalPuzzleSolved
      0,                    // 23: totalChallengeCompleted
      progressSheetId,      // 24: ⭐ LƯU ID SHEET CÁ NHÂN VỪA TẠO
      true,                 // 25: emailVerified
      "",                   // 26: verificationToken
      ""                    // 27: verificationExpires
    ];
    
    userSheet.appendRow(newRow);
    
    return {
      userId: newUserId,
      email: email,
      displayName: name,
      avatarUrl: avatar,
      role: "USER",
      level: 1,
      progressSheetId: progressSheetId,
      status: "success",
      isNewUser: true
    };
  }
}
