/**
 * clientCodeArrangement.js
 * API for Client User to fetch published Code Arrangement game data
 */

function getClientCodeArrangement(topicId) {
  try {
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Không tìm thấy dữ liệu" };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: "Không có câu hỏi nào" };
    
    const headers = data[0];
    const statusIdx = headers.indexOf("status");
    const topicIdx = headers.indexOf("topicId");
    const pubDataIdx = headers.indexOf("publishedData");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdx] === topicId && data[i][statusIdx] === "published") {
        const pubData = data[i][pubDataIdx];
        if (pubData) {
          const parsed = JSON.parse(pubData);
          // Remove originalCode to prevent cheating
          delete parsed.originalCode;
          return { success: true, data: parsed };
        }
      }
    }
    
    return { success: false, message: "Chưa có bài Code Arrangement nào được xuất bản cho Topic này." };
  } catch (error) {
    Logger.log("Error in getClientCodeArrangement: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Fetch all published Code Arrangement games (global)
 */
function getAllClientCodeArrangements() {
  try {
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Không tìm thấy dữ liệu" };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: "Không có bài tập nào" };
    
    const headers = data[0];
    const statusIdx = headers.indexOf("status");
    const pubDataIdx = headers.indexOf("publishedData");
    const topicIdIdx = headers.indexOf("topicId");
    
    let publishedGames = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][statusIdx] === "published") {
        const pubData = data[i][pubDataIdx];
        if (pubData) {
          try {
            const parsed = JSON.parse(pubData);
            // Remove originalCode to prevent cheating
            delete parsed.originalCode;
            // Ensure topicId is kept if we need to identify them
            parsed.topicId = data[i][topicIdIdx];
            publishedGames.push(parsed);
          } catch(e) {
            // Ignore parse errors for individual rows
          }
        }
      }
    }
    
    // Fetch user progress for Code Arrangements
    let completedArrangements = [];
    try {
      const userEmail = Session.getActiveUser().getEmail();
      if (userEmail) {
        const userId = getUserIdByEmail(userEmail);
        if (userId) {
          const userSS = getUserSpreadsheet(userId);
          if (userSS) {
            const capSheet = userSS.getSheetByName("Code_Arrangement_Progress");
            if (capSheet) {
              const capData = capSheet.getDataRange().getValues();
              for (let i = 1; i < capData.length; i++) {
                if (capData[i][2] === "completed") {
                  completedArrangements.push(capData[i][0]);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      Logger.log("Failed to fetch code arrangement progress: " + e.toString());
    }

    return { success: true, data: publishedGames, completed: completedArrangements };
  } catch (error) {
    Logger.log("Error in getAllClientCodeArrangements: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Save code arrangement game progress to User's personal sheet
 * @param {string} topicId 
 * @param {string} arrangementId 
 * @returns {Object} {success, message}
 */
function saveCodeArrangementProgress(topicId, arrangementId) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) return { success: false, message: "Not authenticated" };
    
    // getUserIdByEmail is in content.js
    const userId = getUserIdByEmail(userEmail);
    if (!userId) return { success: false, message: "User not found" };
    
    // getUserSpreadsheet is in content.js
    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) return { success: false, message: "User spreadsheet not found" };
    
    let sheet = spreadsheet.getSheetByName("Code_Arrangement_Progress");
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Code_Arrangement_Progress");
      sheet.getRange(1, 1, 1, 4).setValues([["arrangementId", "topicId", "status", "completedAt"]]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === arrangementId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const now = new Date();
    if (rowIndex === -1) {
      sheet.appendRow([arrangementId, topicId, "completed", now]);
    } else {
      sheet.getRange(rowIndex, 3, 1, 2).setValues([["completed", now]]);
    }
    
    // Also mark challengeDone in Topic_Progress if possible
    try {
      let tpSheet = spreadsheet.getSheetByName("Topic_Progress");
      if (tpSheet) {
        const tpData = tpSheet.getDataRange().getValues();
        const headers = tpData[0];
        const tIdIdx = headers.indexOf("topicId");
        const cdIdx = headers.indexOf("challengeDone");
        if (tIdIdx >= 0 && cdIdx >= 0) {
          for (let i = 1; i < tpData.length; i++) {
            if (String(tpData[i][tIdIdx]).trim() === String(topicId).trim()) {
              tpSheet.getRange(i + 1, cdIdx + 1).setValue(1);
              break;
            }
          }
        }
      }
    } catch(e) {}
    
    try {
      let userSettings = null;
      try { if (typeof getUserSettingsByEmail === "function") { const res = getUserSettingsByEmail(userEmail); if (res && res.success) userSettings = res.data || res.settings; } } catch (e) {}
      if (typeof apiRecordStudyCalendarDay === "function") {
        apiRecordStudyCalendarDay({
          userId: userId,
          email: userEmail,
          date: new Date(),
          studyMinutes: 0,
          lessonCount: 1,
          activityCount: 1,
          goalMinutes: Number(userSettings?.dailyTimeGoal || 0),
          goalLessons: Number(userSettings?.dailyGoal || 0),
          source: "code_arrangement"
        });
      }
    } catch(e) {}
    
    return { success: true, message: "Progress saved" };
  } catch(error) {
    Logger.log("Error in saveCodeArrangementProgress: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Bulk sync code arrangement progress from localStorage
 * @param {Array} games Array of {arrangementId, topicId} objects
 * @returns {Object} {success, message}
 */
function syncBulkCodeArrangementProgress(games) {
  try {
    if (!games || !Array.isArray(games) || games.length === 0) {
      return { success: true, message: "No games to sync" };
    }

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) return { success: false, message: "Not authenticated" };
    
    const userId = getUserIdByEmail(userEmail);
    if (!userId) return { success: false, message: "User not found" };
    
    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) return { success: false, message: "User spreadsheet not found" };
    
    let sheet = spreadsheet.getSheetByName("Code_Arrangement_Progress");
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Code_Arrangement_Progress");
      sheet.getRange(1, 1, 1, 4).setValues([["arrangementId", "topicId", "status", "completedAt"]]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    const data = sheet.getDataRange().getValues();
    const existingMap = {};
    for (let i = 1; i < data.length; i++) {
      existingMap[data[i][0]] = i + 1; // map arrangementId to row index
    }
    
    const now = new Date();
    let tpSheet = spreadsheet.getSheetByName("Topic_Progress");
    let tpData = tpSheet ? tpSheet.getDataRange().getValues() : [];
    let tpHeaders = tpData.length > 0 ? tpData[0] : [];
    let tIdIdx = tpHeaders.indexOf("topicId");
    let cdIdx = tpHeaders.indexOf("challengeDone");

    games.forEach(game => {
      const arrId = game.arrangementId;
      const tId = game.topicId;
      
      if (existingMap[arrId]) {
        const rowIndex = existingMap[arrId];
        sheet.getRange(rowIndex, 3, 1, 2).setValues([["completed", now]]);
      } else {
        sheet.appendRow([arrId, tId, "completed", now]);
        existingMap[arrId] = sheet.getLastRow();
      }
      
      // Update Topic_Progress
      if (tpSheet && tIdIdx >= 0 && cdIdx >= 0) {
        for (let i = 1; i < tpData.length; i++) {
          if (String(tpData[i][tIdIdx]).trim() === String(tId).trim()) {
            tpSheet.getRange(i + 1, cdIdx + 1).setValue(1);
            break;
          }
        }
      }
    });
    
    try {
      let userSettings = null;
      try { if (typeof getUserSettingsByEmail === "function") { const res = getUserSettingsByEmail(userEmail); if (res && res.success) userSettings = res.data || res.settings; } } catch (e) {}
      if (typeof apiRecordStudyCalendarDay === "function" && games.length > 0) {
        apiRecordStudyCalendarDay({
          userId: userId,
          email: userEmail,
          date: new Date(),
          studyMinutes: 0,
          lessonCount: games.length,
          activityCount: games.length,
          goalMinutes: Number(userSettings?.dailyTimeGoal || 0),
          goalLessons: Number(userSettings?.dailyGoal || 0),
          source: "code_arrangement"
        });
      }
    } catch(e) {}
    
    return { success: true, message: `Synced ${games.length} games.` };
  } catch(error) {
    Logger.log("Error in syncBulkCodeArrangementProgress: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
