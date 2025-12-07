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
