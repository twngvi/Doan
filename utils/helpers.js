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
 * Generate a sequential player ID like ID01, ID02
 */
function generatePlayerId(sheet) {
  try {
    if (!sheet) {
      const ss = getOrCreateDatabase();
      sheet = ss.getSheetByName("Users");
    }
    if (!sheet) return "ID01";

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const playerIdIndex = headers.indexOf("playerId");
    
    if (playerIdIndex === -1) return "ID01"; // Nếu chưa có cột playerId

    let maxNum = 0;
    for (let i = 1; i < data.length; i++) {
      const pid = data[i][playerIdIndex];
      if (pid && typeof pid === "string" && pid.startsWith("ID")) {
        const num = parseInt(pid.substring(2), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    
    const newNum = maxNum + 1;
    // Format thành ID01, ID02... ID10, ID100
    return "ID" + newNum.toString().padStart(2, "0");
  } catch (error) {
    Logger.log("Error generating player ID: " + error.toString());
    // Fallback
    return "ID" + Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  }
}

/**
 * Script chạy 1 lần để cấp mã ID cho các tài khoản cũ chưa có hoặc sai định dạng
 * Người dùng có thể chạy hàm này từ Apps Script Editor
 */
function backfillPlayerIds() {
  try {
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      Logger.log("Lỗi: Không tìm thấy bảng Users");
      return;
    }
    
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const playerIdIndex = headers.indexOf("playerId");
    
    if (playerIdIndex === -1) {
      Logger.log("Chưa có cột playerId, tiến hành tự động thêm cột mới...");
      playerIdIndex = headers.length; // Thêm vào cột cuối cùng
      usersSheet.getRange(1, playerIdIndex + 1).setValue("playerId");
      try {
        usersSheet.getRange(1, playerIdIndex + 1).setFontWeight("bold").setBackground("#4285f4").setFontColor("white");
      } catch (e) {} // Bỏ qua nếu lỗi format
    }
    
    let updatedCount = 0;
    
    // Tìm maxNum hiện tại để cấp tiếp theo
    let maxNum = 0;
    for (let i = 1; i < data.length; i++) {
      const pid = data[i][playerIdIndex];
      if (pid && typeof pid === "string" && pid.startsWith("ID")) {
        const num = parseInt(pid.substring(2), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    
    // Cấp ID cho những người chưa có hoặc không bắt đầu bằng ID
    for (let i = 1; i < data.length; i++) {
      const pid = data[i][playerIdIndex];
      if (!pid || (typeof pid === "string" && !pid.startsWith("ID"))) {
        maxNum++;
        const newId = "ID" + maxNum.toString().padStart(2, "0");
        usersSheet.getRange(i + 1, playerIdIndex + 1).setValue(newId);
        updatedCount++;
        Logger.log("Cấp ID mới cho người dùng ở hàng " + (i + 1) + ": " + newId);
      }
    }
    
    Logger.log("Hoàn tất! Đã cấp mã ID mới cho " + updatedCount + " người dùng.");
  } catch (error) {
    Logger.log("Lỗi backfillPlayerIds: " + error.toString());
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

/**
 * Thêm cột playerId bị thiếu vào cuối sheet Users và tạo ID cho các user cũ
 */
function fixMissingPlayerIds() {
  const ss = getOrCreateDatabase();
  const sheet = ss.getSheetByName("Users");

  if (!sheet) {
    throw new Error("Không tìm thấy sheet Users");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  headers = headers.map(h => String(h || "").trim());

  let playerIdCol = headers.indexOf("playerId") + 1;

  if (playerIdCol === 0) {
    playerIdCol = lastCol + 1;
    sheet.getRange(1, playerIdCol).setValue("playerId");
    sheet.getRange(1, playerIdCol).setFontWeight("bold");
    sheet.getRange(1, playerIdCol).setBackground("#4285f4");
    sheet.getRange(1, playerIdCol).setFontColor("white");
    Logger.log("Đã thêm cột playerId ở vị trí cột " + playerIdCol);
  }

  const userIdCol = headers.indexOf("userId") + 1;
  const isActiveCol = headers.indexOf("isActive") + 1;

  if (userIdCol === 0) {
    throw new Error("Thiếu cột userId");
  }

  if (lastRow <= 1) {
    return {
      success: true,
      message: "Sheet Users chưa có dữ liệu user."
    };
  }

  const playerIds = sheet.getRange(2, playerIdCol, lastRow - 1, 1).getValues();
  let updatedCount = 0;
  
  // Find current max ID
  let maxNum = 0;
  for (let i = 0; i < playerIds.length; i++) {
    const pid = playerIds[i][0];
    if (pid && typeof pid === "string" && pid.startsWith("ID")) {
      const num = parseInt(pid.substring(2), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  for (let i = 0; i < playerIds.length; i++) {
    const rowIndex = i + 2;
    const pid = playerIds[i][0];

    if (!pid || (typeof pid === "string" && !pid.startsWith("ID"))) {
      maxNum++;
      const newPlayerId = "ID" + maxNum.toString().padStart(2, "0");
      sheet.getRange(rowIndex, playerIdCol).setValue(newPlayerId);
      updatedCount++;
    }

    if (isActiveCol > 0) {
      const activeValue = sheet.getRange(rowIndex, isActiveCol).getValue();
      if (activeValue === "" || activeValue === null) {
        sheet.getRange(rowIndex, isActiveCol).setValue(true);
      }
    }
  }

  Logger.log("Đã cập nhật playerId cho " + updatedCount + " người dùng.");
  return {
    success: true,
    message: "Đã thêm playerId cho các user bị thiếu."
  };
}
