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

        // Chat sheets removed

        return ss;
      } catch (e) {
        Logger.log(
          "Hard-coded ID failed, falling back to search: " + e.toString(),
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

        // Chat sheets removed

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

    // Ensure core sheets exist
    let usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      Logger.log("Initializing database (missing core sheets)...");
      createAllSheets();
    }
    // Chat sheets removed

    return ss;
  } catch (error) {
    Logger.log("Error getting/creating database: " + error.toString());
    throw new Error(
      "Không thể tạo hoặc truy cập database: " + error.toString(),
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

    // Lấy danh sách sheet 1 lần duy nhất để không phải gọi API 20 lần
    const existingSheets = spreadsheet.getSheets();
    const sheetMap = {};
    existingSheets.forEach(s => sheetMap[s.getName()] = s);

    // Danh sách các bảng không tự động tạo lại
    const DO_NOT_CREATE = [
      "AI_Evaluations", "Chat_History", "Error_Logs", "AI_Question_Pool", 
      "Leaderboard", "User_Achievements", "User_Notebooks", "Achievements", 
      "Answer_History", "User_Progress", "Code_Puzzles", "Challenges", 
      "Admin_Pet_Level_Config", "Admin_Coop_Templates", "User_Farm",
      "FriendRequests", "Friends", "Conversations", "Messages", "Feature_Activity_Logs"
    ];

    // Create each sheet
    Object.values(DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      if (!DO_NOT_CREATE.includes(sheetConfig.name)) {
        createSheet(spreadsheet, sheetConfig, sheetMap);
      }
    });

    // Delete default sheet if exists AFTER creating new ones
    const currentSheets = spreadsheet.getSheets();
    const defaultSheet = currentSheets.find(s => s.getName() === "Sheet1" || s.getName() === "Trang tính1" || s.getName() === "Trang tính 1");
    if (defaultSheet && currentSheets.length > 1) {
      try { spreadsheet.deleteSheet(defaultSheet); } catch (e) { }
    }

    Logger.log("All sheets checked and created successfully!");
    return spreadsheet.getUrl();
  } catch (error) {
    Logger.log("Error creating sheets: " + error.toString());
    return getOrCreateDatabase().getUrl();
  }
}

/**
 * Create a single sheet with headers
 */
function createSheet(spreadsheet, sheetConfig, sheetMap) {
  try {
    let sheet = (sheetMap && sheetMap[sheetConfig.name]) ? sheetMap[sheetConfig.name] : spreadsheet.getSheetByName(sheetConfig.name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetConfig.name);
      if (sheetMap) sheetMap[sheetConfig.name] = sheet;
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

    try {
      if (sheetConfig && sheetConfig.columns && sheetConfig.columns.length <= 10) {
        sheet.autoResizeColumns(1, sheetConfig.columns.length);
      }
    } catch (e) {
      Logger.log("Skipping autoResize for " + sheetConfig.name + ": " + e.toString());
    }
    try {
      sheet.setFrozenRows(1);
    } catch (e) { }

    return sheet;
  } catch (error) {
    Logger.log(
      "Error creating sheet " + sheetConfig.name + ": " + error.toString(),
    );
    return null;
  }
}

/**
 * Update sheet schema
 */
function updateSheetSchema(sheet, sheetConfig) {
  try {
    const lastColumn = sheet.getLastColumn();
    const maxColumns = sheet.getMaxColumns();
    const newColumns = sheetConfig.columns;

    if (maxColumns < newColumns.length) {
      sheet.insertColumnsAfter(maxColumns, newColumns.length - maxColumns);
    }

    if (lastColumn === 0) {
      const headerRange = sheet.getRange(1, 1, 1, newColumns.length);
      headerRange.setValues([newColumns]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("white");
      try { sheet.setFrozenRows(1); } catch (e) { }
      return;
    }

    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

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
      "Error updating schema for " + sheetConfig.name + ": " + error.toString(),
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
  if (typeof USER_DB_CONFIG !== "undefined" && USER_DB_CONFIG.SHEETS) {
    Object.values(USER_DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      const newSheet = ss.insertSheet(sheetConfig.name);
      // Tạo header
      const headerRange = newSheet.getRange(
        1,
        1,
        1,
        sheetConfig.columns.length,
      );
      headerRange.setValues([sheetConfig.columns]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#e6f2ff"); // Màu xanh nhạt cho user db
    });
  }

  return ssId;
}

/**
 * Process Google OAuth User Login
 */
function processGoogleUserLogin(googleProfile, force = false) {
  const ss = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
  const userSheet = ss.getSheetByName(DB_CONFIG.SHEETS.USERS.name);
  const statsSheet = ss.getSheetByName(DB_CONFIG.SHEETS.USER_STATS.name);
  const petsSheet = ss.getSheetByName(DB_CONFIG.SHEETS.USER_PETS.name);

  const data = userSheet.getDataRange().getValues();
  const email = googleProfile.email;
  const googleId = googleProfile.id;
  const avatar = googleProfile.picture;
  const name = googleProfile.name;

  let userRowIndex = -1;
  let existingUser = null;
  const headers = data[0] || [];

  // Cột progressSheetId nằm ở index 18 (theo schema mới: userId(0)... progressSheetId(18))
  const PROGRESS_SHEET_COL_INDEX = headers.indexOf("progressSheetId") >= 0 ? headers.indexOf("progressSheetId") : 18;

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email) { // index 2 is email
      userRowIndex = i + 1;
      existingUser = data[i];
      break;
    }
  }

  let progressSheetId = existingUser ? existingUser[PROGRESS_SHEET_COL_INDEX] : "";

  if (!progressSheetId) {
    try {
      progressSheetId = createUserPersonalSheet(email, name);
      Logger.log("Created new personal sheet for " + email + ": " + progressSheetId);
    } catch (e) {
      Logger.log("Error creating personal sheet: " + e.toString());
    }
  }

  if (existingUser) {
    const isActiveIndex = headers.indexOf("isActive");
    if (isActiveIndex >= 0) {
      const isActiveVal = existingUser[isActiveIndex];
      const isActive = isActiveVal === true || String(isActiveVal).toUpperCase() === "TRUE" || isActiveVal === 1;
      if (!isActive) throw new Error("Tài khoản đã bị khóa. Vui lòng liên hệ admin.");
    }

    const activeSessionIdIndex = headers.indexOf("activeSessionId");
    const activeSessionUpdatedAtIndex = headers.indexOf("activeSessionUpdatedAt");

    if (activeSessionIdIndex >= 0) {
      const currentActiveSession = existingUser[activeSessionIdIndex];
      let isSessionFresh = true;
      if (activeSessionUpdatedAtIndex >= 0) {
        const lastSeenValue = existingUser[activeSessionUpdatedAtIndex];
        const lastSeenTime = lastSeenValue ? new Date(lastSeenValue).getTime() : 0;
        const SESSION_STALE_MS = 90 * 1000;
        isSessionFresh = !!lastSeenTime && Date.now() - lastSeenTime < SESSION_STALE_MS;
      }

      if (currentActiveSession && currentActiveSession !== "" && !isSessionFresh) {
        userSheet.getRange(userRowIndex, activeSessionIdIndex + 1).setValue("");
      }

      // Đã comment out đoạn check session conflict (requireConfirmation) để cho phép đăng nhập tự do (tự động force login)
      /*
      if (currentActiveSession && currentActiveSession !== "" && isSessionFresh && !force) {
        const token = "G_CONFIRM_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        CacheService.getScriptCache().put(token, JSON.stringify(googleProfile), 300);
        return {
          requireConfirmation: true,
          confirmToken: token,
          message: "Tài khoản của bạn đang được đăng nhập ở thiết bị khác. Nếu bạn tiếp tục đăng nhập, thiết bị kia sẽ bị đăng xuất. Bạn có muốn tiếp tục?",
        };
      }
      */
    }

    userSheet.getRange(userRowIndex, 2).setValue(googleId); // Update Google ID

    const lock = LockService.getScriptLock();
    let sessionId = "";
    let now = new Date();
    try {
      lock.waitLock(10000);
      sessionId = "SES_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
      now = new Date();
      const lastLoginCol = headers.indexOf("lastLogin");
      if (lastLoginCol >= 0) userSheet.getRange(userRowIndex, lastLoginCol + 1).setValue(now);

      if (activeSessionIdIndex >= 0) {
        userSheet.getRange(userRowIndex, activeSessionIdIndex + 1).setValue(sessionId);
      }
      if (activeSessionUpdatedAtIndex >= 0) {
        userSheet.getRange(userRowIndex, activeSessionUpdatedAtIndex + 1).setValue(now);
      }
    } catch (e) {
      Logger.log("Lock error for session: " + e.toString());
    } finally {
      lock.releaseLock();
    }

    if (progressSheetId) {
      saveLoginToPersonalSheet(progressSheetId, email, new Date());
      try {
        updateUserStreak(email);
      } catch (e) { }
    }

    const avatarIndex = headers.indexOf("avatarUrl") >= 0 ? headers.indexOf("avatarUrl") : 6;
    const existingAvatar = existingUser[avatarIndex];
    let finalAvatar = existingAvatar;

    if (!existingAvatar || existingAvatar === "" || existingAvatar === "undefined" || existingAvatar === "null") {
      userSheet.getRange(userRowIndex, avatarIndex + 1).setValue(avatar);
      finalAvatar = avatar;
    }

    if (!existingUser[PROGRESS_SHEET_COL_INDEX] && progressSheetId) {
      userSheet.getRange(userRowIndex, PROGRESS_SHEET_COL_INDEX + 1).setValue(progressSheetId);
    }

    const playerIdCol = headers.indexOf("playerId");
    let finalPlayerId = playerIdCol >= 0 ? existingUser[playerIdCol] : "";
    if (!finalPlayerId || finalPlayerId === "") {
      try {
        finalPlayerId = typeof generatePlayerId === 'function' ? generatePlayerId(userSheet) : "ID" + Math.floor(Math.random() * 9000 + 1000);
        if (playerIdCol >= 0) userSheet.getRange(userRowIndex, playerIdCol + 1).setValue(finalPlayerId);
      } catch (e) { }
    }

    // LẤY THÔNG TIN STATS & PETS TỪ SHEET TƯƠNG ỨNG
    let level = 1, totalXP = 0, totalXQP = 0, theme = "forest";
    const userId = existingUser[0];

    if (statsSheet) {
      const statsData = statsSheet.getDataRange().getValues();
      const sHeaders = statsData[0] || [];
      const sLevelIdx = sHeaders.indexOf("level");
      const sXpIdx = sHeaders.indexOf("totalXP");
      const sXqpIdx = sHeaders.indexOf("totalXQP");

      for (let i = 1; i < statsData.length; i++) {
        if (statsData[i][0] === userId) {
          if (sLevelIdx >= 0) level = parseInt(statsData[i][sLevelIdx]) || 1;
          if (sXpIdx >= 0) totalXP = parseInt(statsData[i][sXpIdx]) || 0;
          if (sXqpIdx >= 0) totalXQP = parseInt(statsData[i][sXqpIdx]) || 0;
          break;
        }
      }
    }

    if (petsSheet) {
      const petsData = petsSheet.getDataRange().getValues();
      const pHeaders = petsData[0] || [];
      const themeIdx = pHeaders.indexOf("theme");

      for (let i = 1; i < petsData.length; i++) {
        if (petsData[i][0] === userId) {
          if (themeIdx >= 0) theme = String(petsData[i][themeIdx]) || "forest";
          break;
        }
      }
    }

    const roleIndex = headers.indexOf("role") >= 0 ? headers.indexOf("role") : 7;
    return {
      userId: userId,
      email: email,
      displayName: name,
      avatarUrl: finalAvatar,
      role: existingUser[roleIndex],
      level: level,
      totalXP: totalXP,
      totalXQP: totalXQP,
      progressSheetId: progressSheetId,
      playerId: finalPlayerId,
      theme: theme,
      status: "success",
      sessionId: sessionId,
    };
  } else {
    // === USER MỚI ===
    const newUserId = "USR_" + new Date().getTime();
    const now = new Date();
    const finalPlayerId = typeof generatePlayerId === 'function' ? generatePlayerId(userSheet) : "ID" + Math.floor(Math.random() * 9000 + 1000);

    const newRow = [
      newUserId,
      googleId,
      email,
      name,
      email.split("@")[0],
      "GOOGLE_OAUTH",
      avatar,
      "USER",
      true, // isActive
      now, // createdAt
      now, // lastLogin
      now, // lastActiveDate
      "", // activeSessionId
      "", // activeSessionUpdatedAt
      true, // emailVerified
      "", // verificationToken
      "", // verificationExpires
      finalPlayerId,
      progressSheetId,
    ];

    let sessionId = "";
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      sessionId = "SES_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);

      const activeSessionIdIndex = DB_CONFIG.SHEETS.USERS.columns.indexOf("activeSessionId");
      if (activeSessionIdIndex >= 0) {
        while (newRow.length <= activeSessionIdIndex) newRow.push("");
        newRow[activeSessionIdIndex] = sessionId;
      }

      userSheet.appendRow(newRow);

      // Tạo row cho User_Stats
      if (statsSheet) {
        const statsRow = [newUserId, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0];
        statsSheet.appendRow(statsRow);
      }

      // Tạo row cho User_Pets
      if (petsSheet) {
        const petsRow = [newUserId, "forest", "NAMEPET", ""];
        petsSheet.appendRow(petsRow);
      }
    } catch (e) {
      Logger.log("Lock error for new user session: " + e.toString());
      userSheet.appendRow(newRow);
    } finally {
      lock.releaseLock();
    }

    if (progressSheetId) {
      saveLoginToPersonalSheet(progressSheetId, email, now);
      try { updateUserStreak(email); } catch (e) { }
    }

    return {
      userId: newUserId,
      email: email,
      displayName: name,
      avatarUrl: avatar,
      role: "USER",
      level: 1,
      totalXP: 0,
      totalXQP: 0,
      progressSheetId: progressSheetId,
      playerId: finalPlayerId,
      theme: "forest",
      status: "success",
      isNewUser: true,
      sessionId: sessionId,
    };
  }
}



function cleanupEmptySheets() {
  try {
    const ss = getOrCreateDatabase();
    const sheets = ss.getSheets();
    const chatSheetNames = [
      "FriendRequests",
      "Friends",
      "Conversations",
      "Messages",
      "Feature_Activity_Logs"
    ];
    let deletedCount = 0;

    // 1. Cleanup MASTER_DB
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const sheetName = sheet.getName();
      const lastRow = sheet.getLastRow();

      // Nếu sheet trống (lastRow <= 1 và có thể chỉ có header, hoặc hoàn toàn trống)
      // Thêm điều kiện: xóa Sheet1 hoặc Trang tính1 mặc định nếu có
      const isDefault = ["Sheet1", "Trang tính1", "Trang tính 1"].includes(sheetName);

      if (lastRow <= 1 || isDefault) {
        if (ss.getSheets().length <= 1) {
          Logger.log("Không thể xóa sheet cuối cùng trong MASTER_DB: " + sheetName);
          break;
        }

        if (chatSheetNames.includes(sheetName) || isDefault || lastRow <= 1) {
          Logger.log("Đang xóa sheet trống trong MASTER_DB: " + sheetName);
          ss.deleteSheet(sheet);
          deletedCount++;
        }
      }
    }

    // 2. Cleanup USER_DBs
    try {
      const usersSheet = ss.getSheetByName("Users");
      if (usersSheet) {
        const data = usersSheet.getDataRange().getValues();
        // Assuming progressSheetId is at index 18 based on schema (index 18 is 'progressSheetId')
        const header = data[0];
        const progressSheetIdIndex = header.indexOf("progressSheetId");

        if (progressSheetIdIndex !== -1) {
          for (let r = 1; r < data.length; r++) {
            const progressSheetId = data[r][progressSheetIdIndex];
            if (progressSheetId) {
              try {
                const userSs = SpreadsheetApp.openById(progressSheetId);
                const userSheets = userSs.getSheets();

                for (let j = 0; j < userSheets.length; j++) {
                  const uSheet = userSheets[j];
                  const uSheetName = uSheet.getName();
                  const uLastRow = uSheet.getLastRow();
                  const isUDefault = ["Sheet1", "Trang tính1", "Trang tính 1"].includes(uSheetName);

                  if (uLastRow <= 1 || isUDefault) {
                    if (userSs.getSheets().length <= 1) {
                      break; // Cannot delete last sheet
                    }
                    // Xóa các sheet mặc định (Sheet1) HOẶC các sheet tính năng nhưng đang trống (chỉ có header lastRow <= 1)
                    if (isUDefault || uLastRow <= 1) {
                      Logger.log("Đang xóa sheet trống trong USER_DB " + progressSheetId + ": " + uSheetName);
                      userSs.deleteSheet(uSheet);
                      deletedCount++;
                    }
                  }
                }
              } catch (userErr) {
                Logger.log("Không thể truy cập USER_DB " + progressSheetId + ": " + userErr);
              }
            }
          }
        }
      }
    } catch (e) {
      Logger.log("Lỗi khi quét USER_DB: " + e.toString());
    }

    Logger.log("Hoàn tất dọn dẹp. Đã xóa " + deletedCount + " sheet trống.");
    return { success: true, message: "Đã dọn dẹp " + deletedCount + " sheet trống." };
  } catch (error) {
    Logger.log("Lỗi khi dọn dẹp sheets: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * HÀM CHẠY THỦ CÔNG 1 LẦN ĐỂ CẤP QUYỀN
 * Chạy hàm này để Google Apps Script nhận diện quyền truy cập DriveApp.
 * Sau khi chạy và bấm "Allow" (Cho phép), các file tạo ra sau này
 * sẽ tự động được đưa vào đúng thư mục mà không cần làm gì thêm.
 */
function authSetup() {
  try {
    const TARGET_FOLDER_ID = "1dlc7DeSDw19J9_38E8cJvV5hNeopO3oS";
    DriveApp.getFolderById(TARGET_FOLDER_ID);
    Logger.log("✅ CẤP QUYỀN THÀNH CÔNG!");
    Logger.log("Từ giờ mỗi khi có user mới tạo tài khoản hoặc đăng nhập, Google Sheet cá nhân sẽ TỰ ĐỘNG nằm trong thư mục USER.");
  } catch (e) {
    Logger.log("❌ Lỗi cấp quyền: " + e.toString());
  }
}

