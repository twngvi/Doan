/**
 * helpers.js - General Helper Functions
 *
 * Chứa các hàm tiện ích: generate ID, format date, logging
 */

/**
 * Generate next ID for a sheet
 */
function generateNextId(sheet, prefix) {
  try {
    const data = sheet.getDataRange().getValues();
    let maxNum = 0;

    for (let i = 1; i < data.length; i++) {
      const id = data[i][0];
      if (id && typeof id === "string" && id.startsWith(prefix)) {
        const num = parseInt(id.substring(prefix.length));
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const newNum = maxNum + 1;
    return prefix + newNum.toString().padStart(3, "0");
  } catch (error) {
    Logger.log("Error generating ID: " + error.toString());
    return prefix + "001";
  }
}

/**
 * Format date
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
 * Log activity to System_Logs sheet
 */
function logActivity(logData) {
  try {
    const ss = getOrCreateDatabase();
    const logsSheet = ss.getSheetByName("System_Logs");

    if (!logsSheet) {
      Logger.log("System_Logs sheet not found");
      return;
    }

    const logId = generateNextId(logsSheet, "LOG");
    const timestamp = new Date();

    // Columns: logId, timestamp, level, category, userId, action, details, ipAddress, sessionId, errorMessage
    const logRow = [
      logId,
      timestamp,
      logData.level || "INFO",
      logData.category || "SYSTEM",
      logData.userId || "",
      logData.action || "",
      logData.details || "",
      logData.ipAddress || "",
      logData.sessionId || Session.getTemporaryActiveUserKey() || "",
      logData.errorMessage || "",
    ];

    logsSheet.appendRow(logRow);
  } catch (error) {
    Logger.log("Error logging activity: " + error.toString());
  }
}

/**
 * Generate Gravatar URL from email
 * @param {string} email - User's email address
 * @param {number} size - Image size (default: 200)
 * @param {string} defaultImage - Default image type (default: 'identicon')
 * @returns {string} - Gravatar URL
 */
function getGravatarUrl(email, size, defaultImage) {
  try {
    size = size || 200;
    defaultImage = defaultImage || "identicon";

    // Create MD5 hash of email
    const emailLower = email.trim().toLowerCase();
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      emailLower,
      Utilities.Charset.UTF_8
    );

    // Convert hash to hex string
    const hexHash = hash
      .map(function (byte) {
        const v = byte < 0 ? 256 + byte : byte;
        return ("0" + v.toString(16)).slice(-2);
      })
      .join("");

    return (
      "https://www.gravatar.com/avatar/" +
      hexHash +
      "?s=" +
      size +
      "&d=" +
      defaultImage
    );
  } catch (error) {
    Logger.log("Error generating Gravatar URL: " + error.toString());
    return "https://www.gravatar.com/avatar/?d=mp&s=" + (size || 200);
  }
}
