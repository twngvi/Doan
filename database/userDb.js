/**
 * userDb.js - User Personal Database Management
 *
 * Chứa các hàm quản lý USER_DB: create user sheets, manage user data
 */

/**
 * Create personal sheet for user
 */
function createUserPersonalSheet(userId, username) {
  try {
    Logger.log("Creating personal sheet for user: " + userId);

    const existingSheetId = findUserProgressSheet(userId);
    if (existingSheetId) {
      Logger.log("User already has sheet: " + existingSheetId);
      return existingSheetId;
    }

    const sheetName = USER_DB_CONFIG.SHEET_NAME_PREFIX + userId;
    const userSpreadsheet = SpreadsheetApp.create(sheetName);
    const spreadsheetId = userSpreadsheet.getId();

    Logger.log("Created new sheet: " + spreadsheetId);

    // Move to specific folder
    try {
      const folder = DriveApp.getFolderById(DB_CONFIG.USER_SHEETS_FOLDER_ID);
      const file = DriveApp.getFileById(spreadsheetId);

      // Remove from root folder
      const parents = file.getParents();
      while (parents.hasNext()) {
        const parent = parents.next();
        parent.removeFile(file);
      }

      // Add to user sheets folder
      folder.addFile(file);
      Logger.log("Moved sheet to folder: " + DB_CONFIG.USER_SHEETS_FOLDER_ID);
    } catch (folderError) {
      Logger.log(
        "Warning: Could not move to folder: " + folderError.toString()
      );
      // Continue even if moving fails
    }

    // Delete default sheet
    const defaultSheet = userSpreadsheet.getSheets()[0];
    if (defaultSheet && defaultSheet.getName() !== "Profile") {
      try {
        userSpreadsheet.deleteSheet(defaultSheet);
      } catch (e) {
        Logger.log("Could not delete default sheet: " + e.toString());
      }
    }

    // Create all sheets
    Object.values(USER_DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      createUserSheet(userSpreadsheet, sheetConfig);
    });

    // Initialize Profile
    initializeUserProfile(userSpreadsheet, userId, username);

    // Update MASTER_DB with sheet ID
    updateUserProgressSheetId(userId, spreadsheetId);

    Logger.log("Personal sheet created successfully: " + spreadsheetId);
    return spreadsheetId;
  } catch (error) {
    Logger.log("Error creating personal sheet: " + error.toString());
    throw error;
  }
}

/**
 * Create sheet in user's spreadsheet
 */
function createUserSheet(spreadsheet, sheetConfig) {
  try {
    let sheet = spreadsheet.getSheetByName(sheetConfig.name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetConfig.name);
      Logger.log("Created sheet: " + sheetConfig.name);
    }

    const headerRange = sheet.getRange(1, 1, 1, sheetConfig.columns.length);
    headerRange.setValues([sheetConfig.columns]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#34a853");
    headerRange.setFontColor("white");

    sheet.autoResizeColumns(1, sheetConfig.columns.length);
    sheet.setFrozenRows(1);

    return sheet;
  } catch (error) {
    Logger.log(
      "Error creating user sheet " + sheetConfig.name + ": " + error.toString()
    );
    throw error;
  }
}

/**
 * Initialize user profile
 */
function initializeUserProfile(spreadsheet, userId, username) {
  try {
    const profileSheet = spreadsheet.getSheetByName("Profile");
    if (!profileSheet) return;

    const timestamp = new Date();

    const profileData = [
      userId,
      username,
      1,
      0,
      1,
      1,
      0,
      0,
      0,
      timestamp,
      timestamp,
    ];

    profileSheet.getRange(2, 1, 1, profileData.length).setValues([profileData]);
    Logger.log("Profile initialized for user: " + userId);
  } catch (error) {
    Logger.log("Error initializing profile: " + error.toString());
  }
}

/**
 * Update user's progress sheet ID in MASTER_DB
 */
function updateUserProgressSheetId(userId, progressSheetId) {
  try {
    const spreadsheet = getOrCreateDatabase();
    const usersSheet = spreadsheet.getSheetByName("Users");

    if (!usersSheet) {
      throw new Error("Users sheet not found in MASTER_DB");
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const progressSheetIdIndex = headers.indexOf("progressSheetId");

    if (progressSheetIdIndex === -1) {
      throw new Error("Column progressSheetId not found");
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        usersSheet
          .getRange(i + 1, progressSheetIdIndex + 1)
          .setValue(progressSheetId);
        Logger.log("Updated progressSheetId for user: " + userId);
        return;
      }
    }

    Logger.log("User not found: " + userId);
  } catch (error) {
    Logger.log("Error updating progressSheetId: " + error.toString());
  }
}

/**
 * Find user's progress sheet
 */
function findUserProgressSheet(userId) {
  try {
    const spreadsheet = getOrCreateDatabase();
    const usersSheet = spreadsheet.getSheetByName("Users");

    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      const headers = data[0];
      const progressSheetIdIndex = headers.indexOf("progressSheetId");

      if (progressSheetIdIndex !== -1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === userId && data[i][progressSheetIdIndex]) {
            return data[i][progressSheetIdIndex];
          }
        }
      }
    }

    const sheetName = USER_DB_CONFIG.SHEET_NAME_PREFIX + userId;
    const files = DriveApp.getFilesByName(sheetName);

    if (files.hasNext()) {
      const file = files.next();
      Logger.log("Found sheet in Drive: " + file.getId());
      return file.getId();
    }

    return null;
  } catch (error) {
    Logger.log("Error finding user sheet: " + error.toString());
    return null;
  }
}

/**
 * Get user spreadsheet object
 */
function getUserSpreadsheet(userId) {
  try {
    const spreadsheetId = findUserProgressSheet(userId);
    if (!spreadsheetId) {
      Logger.log("User doesn't have sheet: " + userId);
      return null;
    }

    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    Logger.log("Error opening user spreadsheet: " + error.toString());
    return null;
  }
}
