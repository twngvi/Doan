/**
 * utils.gs - Utility Functions
 *
 * Helper functions for ID generation, password hashing, logging, etc.
 */

/**
 * Generate next ID for a sheet
 * @param {Sheet} sheet - Google Sheet object
 * @param {string} prefix - ID prefix (e.g., 'USR', 'TOP')
 * @return {string} New ID
 */
function generateNextId(sheet, prefix) {
  try {
    const data = sheet.getDataRange().getValues();
    let maxNum = 0;

    // Find highest number
    for (let i = 1; i < data.length; i++) {
      const id = data[i][0];
      if (id && typeof id === "string" && id.startsWith(prefix)) {
        const num = parseInt(id.substring(prefix.length));
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    // Generate new ID
    const newNum = maxNum + 1;
    const newId = prefix + newNum.toString().padStart(3, "0");

    return newId;
  } catch (error) {
    Logger.log("Error generating ID: " + error.toString());
    return prefix + "001";
  }
}

/**
 * Simple password hashing (for demo purposes)
 * In production, use a more secure method
 * @param {string} password - Plain text password
 * @return {string} Hashed password
 */
function hashPassword(password) {
  try {
    // Simple hash using Utilities.computeDigest
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password,
      Utilities.Charset.UTF_8
    );

    // Convert to hex string
    return hash
      .map(function (byte) {
        const v = byte < 0 ? 256 + byte : byte;
        return ("0" + v.toString(16)).slice(-2);
      })
      .join("");
  } catch (error) {
    Logger.log("Error hashing password: " + error.toString());
    return password; // Fallback (not recommended for production)
  }
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @return {boolean} Match result
 */
function verifyPassword(password, hash) {
  try {
    const inputHash = hashPassword(password);
    return inputHash === hash;
  } catch (error) {
    Logger.log("Error verifying password: " + error.toString());
    return false;
  }
}

/**
 * Log activity to Logs sheet
 * @param {Object} logData - { level, category, userId, action, details }
 */
function logActivity(logData) {
  try {
    const ss = getOrCreateDatabase();
    const logsSheet = ss.getSheetByName("Logs");

    if (!logsSheet) {
      Logger.log("Logs sheet not found");
      return;
    }

    const logId = generateNextId(logsSheet, "LOG");
    const timestamp = new Date().toISOString();

    const logRow = [
      logId, // logId
      timestamp, // timestamp
      logData.level || "INFO", // level
      logData.category || "SYSTEM", // category
      logData.userId || "", // userId
      logData.action || "", // action
      logData.details || "", // details
      logData.ipAddress || "", // ipAddress
      logData.userAgent || "", // userAgent
      logData.sessionId || "", // sessionId
    ];

    logsSheet.appendRow(logRow);
  } catch (error) {
    Logger.log("Error logging activity: " + error.toString());
  }
}

/**
 * Get or create database spreadsheet
 * @return {Spreadsheet} Database spreadsheet
 */
function getOrCreateDatabase() {
  try {
    // Try to find existing database by name
    const files = DriveApp.getFilesByName("DB_Master");

    let ss;
    if (files.hasNext()) {
      const file = files.next();
      ss = SpreadsheetApp.openById(file.getId());
      Logger.log("Found existing database: " + ss.getId());
    } else {
      // Create new database
      ss = SpreadsheetApp.create("DB_Master");
      Logger.log("Created new database: " + ss.getId());
    }

    // Check if Users sheet exists, if not initialize database
    let usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      Logger.log("Users sheet not found. Initializing database...");

      // Get all sheets to find default sheet
      const allSheets = ss.getSheets();
      let defaultSheet = null;

      // Try to find Sheet1 or any default sheet
      for (let i = 0; i < allSheets.length; i++) {
        const sheetName = allSheets[i].getName();
        if (
          sheetName === "Sheet1" ||
          sheetName.startsWith("Sheet") ||
          sheetName === "Trang tính1"
        ) {
          defaultSheet = allSheets[i];
          break;
        }
      }

      if (defaultSheet) {
        // Rename existing default sheet to Users
        const oldName = defaultSheet.getName();
        usersSheet = defaultSheet;
        usersSheet.setName("Users");
        Logger.log("Renamed '" + oldName + "' to Users");
      } else {
        // No default sheet found, create new Users sheet
        usersSheet = ss.insertSheet("Users");
        Logger.log("Created new Users sheet");
      }

      // Set up Users sheet with headers
      const userHeaders = [
        "userId",
        "username",
        "email",
        "passwordHash",
        "fullName",
        "role",
        "createdAt",
        "lastLogin",
        "isActive",
        "spreadsheetId",
      ];
      const headerRange = usersSheet.getRange(1, 1, 1, userHeaders.length);
      headerRange.setValues([userHeaders]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("white");
      usersSheet.setFrozenRows(1);

      // Create other essential sheets
      const sheetsConfig = [
        {
          name: "Topics",
          headers: ["topicId", "title", "description", "category"],
        },
        {
          name: "MCQ_Questions",
          headers: [
            "questionId",
            "topicId",
            "questionText",
            "optionA",
            "optionB",
            "optionC",
            "optionD",
            "correctAnswer",
            "explanation",
            "difficulty",
            "hint",
            "points",
          ],
        },
        {
          name: "Matching_Pairs",
          headers: [
            "pairId",
            "topicId",
            "leftItem",
            "rightItem",
            "itemType",
            "difficulty",
            "hints",
          ],
        },
        {
          name: "Logs",
          headers: [
            "logId",
            "timestamp",
            "level",
            "category",
            "userId",
            "action",
            "details",
            "ipAddress",
            "userAgent",
            "sessionId",
          ],
        },
        {
          name: "Template_UserProgress",
          headers: [
            "progressId",
            "topicId",
            "activityType",
            "completedAt",
            "score",
            "timeSpent",
            "attempts",
            "isCompleted",
          ],
        },
      ];

      sheetsConfig.forEach((config) => {
        let sheet = ss.getSheetByName(config.name);
        if (!sheet) {
          sheet = ss.insertSheet(config.name);
          const range = sheet.getRange(1, 1, 1, config.headers.length);
          range.setValues([config.headers]);
          range.setFontWeight("bold");
          range.setBackground("#4285f4");
          range.setFontColor("white");
          sheet.setFrozenRows(1);
          Logger.log("Created sheet: " + config.name);
        }
      });

      Logger.log("Database initialized successfully!");
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
 * Format date to readable string
 * @param {Date} date - Date object
 * @return {string} Formatted date
 */
function formatDate(date) {
  if (!date) return "";

  try {
    if (typeof date === "string") {
      date = new Date(date);
    }

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss"
    );
  } catch (error) {
    Logger.log("Error formatting date: " + error.toString());
    return date.toString();
  }
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @return {boolean} Valid or not
 */
function isValidEmail(email) {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random string (for session IDs, etc.)
 * @param {number} length - Length of string
 * @return {string} Random string
 */
function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
