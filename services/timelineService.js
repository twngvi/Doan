/**
 * timelineService.js - Timeline & Smart Reminder System
 * 
 * Handles:
 * - Study Settings (daily goals, reminders)
 * - Dynamic Timeline Generation
 * - Daily Quests
 * - Streak Recovery
 */

function normalizeStudyHeader_(value) {
  return String(value || "").trim();
}

function parseStudyNumber_(val, fallback) {
  if (val === "" || val === null || val === undefined) {
    return fallback;
  }
  if (val instanceof Date) {
    const epoch = new Date(1899, 11, 30);
    const diffMs = val.getTime() - epoch.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.round(diffDays);
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function getStudyColumnInfo_(usersSheet) {
  let lastCol = Math.max(usersSheet.getLastColumn(), 1);
  let headers = usersSheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(normalizeStudyHeader_);

  const requiredCols = [
    "dailyGoal",
    "dailyTimeGoal",
    "emailReminderEnabled",
    "reminderTimes",
    "reminderMode"
  ];

  requiredCols.forEach(function (colName) {
    const exists = headers.some(function (h) {
      return h === colName;
    });

    if (!exists) {
      const nextCol = headers.length + 1;
      usersSheet.getRange(1, nextCol).setValue(colName);
      headers.push(colName);
    }
  });

  SpreadsheetApp.flush();

  lastCol = Math.max(usersSheet.getLastColumn(), 1);
  headers = usersSheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(normalizeStudyHeader_);

  const map = {};
  headers.forEach(function (header, index) {
    if (!map[header]) map[header] = [];
    map[header].push(index);
  });

  return {
    headers: headers,
    lastCol: lastCol,
    map: map
  };
}

function readFirstStudyValue_(row, colList) {
  if (!colList || !colList.length) return "";

  for (let i = 0; i < colList.length; i++) {
    const idx = colList[i];
    const value = row[idx];

    if (value !== "" && value !== null && value !== undefined) {
      return value;
    }
  }

  return "";
}

function writeStudyValueToAllCols_(row, colList, value) {
  if (!colList || !colList.length) return;

  colList.forEach(function (idx) {
    row[idx] = value;
  });
}

function parseStudySettingsFromRow_(row, colMap) {
  const dailyGoalRaw = readFirstStudyValue_(row, colMap.dailyGoal);
  const dailyTimeGoalRaw = readFirstStudyValue_(row, colMap.dailyTimeGoal);
  const emailReminderRaw = readFirstStudyValue_(row, colMap.emailReminderEnabled);
  const reminderTimesRaw = readFirstStudyValue_(row, colMap.reminderTimes);
  const reminderModeRaw = readFirstStudyValue_(row, colMap.reminderMode);

  let reminderTimes = ["20:00"];

  if (reminderTimesRaw !== "" && reminderTimesRaw !== null && reminderTimesRaw !== undefined) {
    try {
      const parsed = JSON.parse(String(reminderTimesRaw));
      reminderTimes = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch (e) {
      reminderTimes = [String(reminderTimesRaw)];
    }
  }

  return {
    dailyGoal: parseStudyNumber_(dailyGoalRaw, 5),
    dailyTimeGoal: parseStudyNumber_(dailyTimeGoalRaw, 15),
    emailReminderEnabled:
      emailReminderRaw === true ||
      String(emailReminderRaw).trim().toLowerCase() === "true",
    reminderTimes: reminderTimes,
    reminderMode: parseStudyNumber_(reminderModeRaw, 1)
  };
}

function findStudySettingsUserRow_(data, headers, userContext) {
  const emailCol = headers.indexOf("email");
  const userIdCol = headers.indexOf("userId");

  if (emailCol === -1) {
    return {
      rowIndex: -1,
      message: "Sheet Users không có cột email"
    };
  }

  const userIdToSearch = userContext && userContext.userId
    ? String(userContext.userId).trim()
    : "";

  const emailToSearch = userContext && userContext.email
    ? String(userContext.email).trim().toLowerCase()
    : "";

  // 1. Ưu tiên đúng cặp userId + email trên cùng một dòng.
  if (userIdToSearch && emailToSearch && userIdCol !== -1) {
    for (let i = 1; i < data.length; i++) {
      const rowUserId = String(data[i][userIdCol] || "").trim();
      const rowEmail = String(data[i][emailCol] || "").trim().toLowerCase();

      if (rowUserId === userIdToSearch && rowEmail === emailToSearch) {
        return {
          rowIndex: i,
          message: "matched_by_userId_and_email"
        };
      }
    }
  }

  // 2. Fallback theo email.
  if (emailToSearch) {
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][emailCol] || "").trim().toLowerCase();

      if (rowEmail === emailToSearch) {
        return {
          rowIndex: i,
          message: "matched_by_email"
        };
      }
    }
  }

  // 3. Chỉ fallback theo userId nếu không có email.
  if (!emailToSearch && userIdToSearch && userIdCol !== -1) {
    for (let i = 1; i < data.length; i++) {
      const rowUserId = String(data[i][userIdCol] || "").trim();

      if (rowUserId === userIdToSearch) {
        return {
          rowIndex: i,
          message: "matched_by_userId_only"
        };
      }
    }
  }

  return {
    rowIndex: -1,
    message: "User not found"
  };
}

function getStudySettings(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail) {
      return {
        success: false,
        message: "Chưa đăng nhập"
      };
    }

    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        success: false,
        message: "Không tìm thấy sheet Users"
      };
    }

    const colInfo = getStudyColumnInfo_(usersSheet);
    const data = usersSheet.getRange(1, 1, usersSheet.getLastRow(), colInfo.lastCol).getValues();

    const findResult = findStudySettingsUserRow_(data, colInfo.headers, {
      userId: userContext && userContext.userId ? userContext.userId : "",
      email: userEmail
    });

    if (findResult.rowIndex === -1) {
      return {
        success: false,
        message: findResult.message || "User not found"
      };
    }

    const row = data[findResult.rowIndex];
    const settings = parseStudySettingsFromRow_(row, colInfo.map);

    return {
      success: true,
      settings: settings,
      debug: {
        row: findResult.rowIndex + 1,
        matchMode: findResult.message
      }
    };
  } catch (error) {
    Logger.log("Error getStudySettings: " + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

function updateStudySettings(userContext, settings) {
  try {
    if (settings === undefined && userContext && userContext.settings) {
      settings = userContext.settings;
    }

    if (!settings || typeof settings !== "object") {
      return {
        success: false,
        message: "Thiếu settings. Không thể lưu cài đặt học tập."
      };
    }

    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    const emailToSearch = userContext && userContext.email
      ? String(userContext.email).trim().toLowerCase()
      : String(userEmail || "").trim().toLowerCase();

    if (!emailToSearch) {
      return {
        success: false,
        message: "Chưa đăng nhập hoặc thiếu email"
      };
    }

    const normalizedSettings = {
      dailyGoal: Number(settings.dailyGoal),
      dailyTimeGoal: Number(settings.dailyTimeGoal),
      emailReminderEnabled: settings.emailReminderEnabled === true,
      reminderTimes: Array.isArray(settings.reminderTimes)
        ? settings.reminderTimes
        : ["20:00"],
      reminderMode: Number(settings.reminderMode || 1)
    };

    if (
      !Number.isInteger(normalizedSettings.dailyGoal) ||
      normalizedSettings.dailyGoal < 1 ||
      normalizedSettings.dailyGoal > 20
    ) {
      return {
        success: false,
        message: "Mục tiêu bài học phải từ 1 đến 20"
      };
    }

    if (
      !Number.isInteger(normalizedSettings.dailyTimeGoal) ||
      normalizedSettings.dailyTimeGoal < 1 ||
      normalizedSettings.dailyTimeGoal > 300
    ) {
      return {
        success: false,
        message: "Thời gian học phải từ 1 đến 300 phút"
      };
    }

    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        success: false,
        message: "Không tìm thấy sheet Users"
      };
    }

    const colInfo = getStudyColumnInfo_(usersSheet);
    const lastRow = usersSheet.getLastRow();
    const data = usersSheet.getRange(1, 1, lastRow, colInfo.lastCol).getValues();

    const findResult = findStudySettingsUserRow_(data, colInfo.headers, {
      userId: userContext && userContext.userId ? userContext.userId : "",
      email: emailToSearch
    });

    if (findResult.rowIndex === -1) {
      return {
        success: false,
        message: findResult.message || "User not found"
      };
    }

    const targetRow = findResult.rowIndex + 1;
    const row = usersSheet.getRange(targetRow, 1, 1, colInfo.lastCol).getValues()[0];

    writeStudyValueToAllCols_(row, colInfo.map.dailyGoal, normalizedSettings.dailyGoal);
    writeStudyValueToAllCols_(row, colInfo.map.dailyTimeGoal, normalizedSettings.dailyTimeGoal);
    writeStudyValueToAllCols_(row, colInfo.map.emailReminderEnabled, normalizedSettings.emailReminderEnabled);
    writeStudyValueToAllCols_(row, colInfo.map.reminderTimes, JSON.stringify(normalizedSettings.reminderTimes));
    writeStudyValueToAllCols_(row, colInfo.map.reminderMode, normalizedSettings.reminderMode);

    usersSheet.getRange(targetRow, 1, 1, colInfo.lastCol).setValues([row]);

    // Force format columns to number format to overwrite previous date formatting
    colInfo.map.dailyGoal.forEach(function (idx) {
      usersSheet.getRange(targetRow, idx + 1).setNumberFormat("0");
    });
    colInfo.map.dailyTimeGoal.forEach(function (idx) {
      usersSheet.getRange(targetRow, idx + 1).setNumberFormat("0");
    });
    colInfo.map.reminderMode.forEach(function (idx) {
      usersSheet.getRange(targetRow, idx + 1).setNumberFormat("0");
    });

    SpreadsheetApp.flush();
    Utilities.sleep(500);

    const verifiedRow = usersSheet.getRange(targetRow, 1, 1, colInfo.lastCol).getValues()[0];
    const verifiedSettings = parseStudySettingsFromRow_(verifiedRow, colInfo.map);

    if (
      Number(verifiedSettings.dailyGoal) !== Number(normalizedSettings.dailyGoal) ||
      Number(verifiedSettings.dailyTimeGoal) !== Number(normalizedSettings.dailyTimeGoal)
    ) {
      return {
        success: false,
        message:
          "Backend ghi không khớp. targetRow=" +
          targetRow +
          ", matchMode=" +
          findResult.message +
          ", expected=" +
          JSON.stringify(normalizedSettings) +
          ", verified=" +
          JSON.stringify(verifiedSettings),
        settings: verifiedSettings,
        debug: {
          targetRow: targetRow,
          matchMode: findResult.message,
          columnMap: colInfo.map,
          headers: colInfo.headers
        }
      };
    }

    return {
      success: true,
      message: "Cập nhật thành công",
      settings: verifiedSettings,
      debug: {
        targetRow: targetRow,
        matchMode: findResult.message
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Generate Study Timeline based on unlocked topics and user's daily goal
 */
function generateTimeline(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail) return { success: false, message: "Chưa đăng nhập" };

    // Get settings
    const settingsRes = getStudySettings(userContext);
    const dailyGoal = settingsRes.success ? settingsRes.settings.dailyGoal : 5;

    // Get topics
    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const topicsSheet = ss.getSheetByName("Topics");
    const topicsData = topicsSheet.getDataRange().getValues();
    const topicsHeaders = topicsData[0];

    const topicIdCol = topicsHeaders.indexOf("topicId");
    const titleCol = topicsHeaders.indexOf("title");
    const isLockedCol = topicsHeaders.indexOf("isLocked");
    const orderCol = topicsHeaders.indexOf("order");

    let allTopics = [];
    for (let i = 1; i < topicsData.length; i++) {
      if (!topicsData[i][topicIdCol]) continue;
      // Skip locked topics that are globally locked
      if (topicsData[i][isLockedCol] === true || topicsData[i][isLockedCol] === "TRUE") continue;

      allTopics.push({
        topicId: topicsData[i][topicIdCol],
        title: topicsData[i][titleCol],
        order: parseInt(topicsData[i][orderCol]) || 999
      });
    }
    
    // Sort topics by order
    allTopics.sort((a,b) => a.order - b.order);

    // Get user progress
    let completedTopics = new Set();
    let todayCompletedTopics = new Set();
    let todayCompletedCount = 0;

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (progressSheetId) {
      const pSS = SpreadsheetApp.openById(progressSheetId);
      const prgSheet = pSS.getSheetByName("Topic_Progress");
      if (prgSheet) {
        const pData = prgSheet.getDataRange().getValues();
        const pHeaders = pData[0];
        const pTopicIdCol = pHeaders.indexOf("topicId");
        const pStatusCol = pHeaders.indexOf("status");
        const pCompletedAtCol = pHeaders.indexOf("completedAt");
        
        const today = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");

        for (let i = 1; i < pData.length; i++) {
           if (pData[i][pStatusCol] === "completed") {
              completedTopics.add(pData[i][pTopicIdCol]);
              
              let compDate = pData[i][pCompletedAtCol];
              if (compDate) {
                  let dStr = compDate instanceof Date ? Utilities.formatDate(compDate, "Asia/Ho_Chi_Minh", "yyyy-MM-dd") : String(compDate).substring(0,10);
                  if (dStr === today) {
                      todayCompletedCount++;
                      todayCompletedTopics.add(pData[i][pTopicIdCol]);
                  }
              }
           }
        }
      }
    }

    // Filter unfinished
    let unfinished = allTopics.filter(t => !completedTopics.has(t.topicId));
    
    // Get topics completed today
    let completedToday = allTopics.filter(t => todayCompletedTopics.has(t.topicId)).map(t => ({ ...t, isCompleted: true }));
    let remainingUnfinished = unfinished.slice(0, Math.max(0, dailyGoal - completedToday.length)).map(t => ({ ...t, isCompleted: false }));
    let todayLessons = [...completedToday, ...remainingUnfinished];

    // If still less than dailyGoal (e.g. no more unfinished topics), just pad it? 
    // Or just show whatever is available up to dailyGoal
    todayLessons = todayLessons.slice(0, dailyGoal);
    
    // If we want exactly dailyGoal, and there are not enough, what do we do? 
    // Usually we just show what's available. If the user wants exactly dailyGoal, and there are only 4 topics left in the whole DB, it will show 4.
    
    let timeline = {
      today: {
        goal: dailyGoal,
        completed: todayCompletedCount,
        lessons: todayLessons
      },
      tomorrow: {
        lessons: unfinished.slice(Math.max(0, dailyGoal - todayCompletedCount), Math.max(0, dailyGoal - todayCompletedCount) + dailyGoal)
      },
      nextDay: {
        lessons: unfinished.slice(Math.max(0, dailyGoal - todayCompletedCount) + dailyGoal, Math.max(0, dailyGoal - todayCompletedCount) + dailyGoal * 2)
      }
    };

    return { success: true, timeline: timeline };
  } catch(error) {
    Logger.log("Error generateTimeline: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get daily quests (generates random ones if not exist for today)
 */
function getDailyQuests(userContext) {
   const settingsRes = getStudySettings(userContext);
   const target = settingsRes.success && settingsRes.settings.dailyTimeGoal ? settingsRes.settings.dailyTimeGoal : 15;

   let current = 0;
   try {
     const userEmail = resolveAuthenticatedEmailFromContext(userContext);
     const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
     if (progressSheetId) {
        const spreadsheet = SpreadsheetApp.openById(progressSheetId);
        let sheet = spreadsheet.getSheetByName("Daily_Learning");
        if (sheet) {
           const today = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
           const dataRange = sheet.getDataRange().getValues();
           for (let i = 1; i < dataRange.length; i++) {
             if (dataRange[i][0] === today) {
                current = parseInt(dataRange[i][1]) || 0;
                break;
             }
           }
        }
     }
   } catch (e) {}

   return {
     success: true,
     quests: [
       { id: 3, title: `Học liên tục ${target} phút`, current: current, target: target, rewardXP: 30, rewardCoin: 5, isCompleted: current >= target }
     ]
   };
}

/**
 * Recover Streak
 */
function recoverStreak(userContext) {
  try {
     const RECOVERY_COST = 100; // Coin cost
     // To be implemented: Deduct coin, fill the missing day in Checkin_History.
     return { success: false, message: "Tính năng khôi phục Streak đang được hoàn thiện." };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}
