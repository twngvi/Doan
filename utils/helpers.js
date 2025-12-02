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
 * Log activity to Logs sheet
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
    const timestamp = new Date();

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
    ];

    logsSheet.appendRow(logRow);
  } catch (error) {
    Logger.log("Error logging activity: " + error.toString());
  }
}
