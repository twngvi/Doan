/**
 * Learning Time Tracker Service
 * Tracks user's daily learning time and manages streak system
 *
 * Requirements:
 * - Track time spent in: Lesson, Mindmap, Flashcard, Quiz
 * - Save daily learning time to user's personal Google Sheet
 * - Streak: consecutive days with login (tracked via Login_History sheet)
 */



// ========================================
// STREAK MANAGEMENT FUNCTIONS
// ========================================

/**
 * Update user's streak based on Login_History in personal sheet
 * Called on login - calculates consecutive login days
 *
 * @param {string} email - User's email
 * @param {string} today - Today's date string YYYY-MM-DD (optional, used by learning tracker)
 */
function updateUserStreak(email, today) {
  try {
    // Get user's personal sheet
    const progressSheetId = getUserProgressSheetIdByEmail(email);
    if (!progressSheetId) {
      Logger.log("No personal sheet found for: " + email);
      return;
    }

    const spreadsheet = SpreadsheetApp.openById(progressSheetId);
    const streakResult = calculateStreakFromCheckinHistory(spreadsheet);

    // Update master DB with streak data
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) return;

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const emailCol = headers.indexOf("email");
    const currentStreakCol = headers.indexOf("currentStreak");
    const longestStreakCol = headers.indexOf("longestStreak");
    const lastActiveCol = headers.indexOf("lastActiveDate");

    if (emailCol === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        const rowIndex = i + 1;

        const todayStr =
          today ||
          Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");

        // Save to sheet
        if (currentStreakCol !== -1) {
          usersSheet
            .getRange(rowIndex, currentStreakCol + 1)
            .setValue(streakResult.currentStreak);
        }
        if (longestStreakCol !== -1) {
          usersSheet
            .getRange(rowIndex, longestStreakCol + 1)
            .setValue(streakResult.longestStreak);
        }
        if (lastActiveCol !== -1) {
          usersSheet.getRange(rowIndex, lastActiveCol + 1).setValue(todayStr);
        }

        Logger.log(
          `Updated streak for ${email}: current=${streakResult.currentStreak}, longest=${streakResult.longestStreak}`,
        );
        break;
      }
    }
  } catch (error) {
    Logger.log("Error updating streak: " + error.toString());
  }
}

/**
 * Calculate streak from Checkin_History sheet (source of truth for check-in)
 * Streak = consecutive check-in days going backward from today
 * If today has no check-in, check yesterday - if neither, streak = 0
 *
 * @param {Spreadsheet} spreadsheet - User's personal spreadsheet
 * @returns {Object} { currentStreak, longestStreak }
 */
function calculateStreakFromCheckinHistory(spreadsheet) {
  try {
    const checkinSheet = spreadsheet.getSheetByName("Checkin_History");
    if (!checkinSheet) return { currentStreak: 0, longestStreak: 0 };

    const data = checkinSheet.getDataRange().getValues();
    if (data.length <= 1) return { currentStreak: 0, longestStreak: 0 };

    // Extract unique check-in dates (column 0 = date in YYYY-MM-DD format)
    const checkinDates = new Set();
    for (let i = 1; i < data.length; i++) {
      const dateVal = data[i][0];
      if (dateVal) {
        // Google Sheets may return Date objects — convert properly
        let dateStr;
        if (dateVal instanceof Date) {
          dateStr = Utilities.formatDate(
            dateVal,
            "Asia/Ho_Chi_Minh",
            "yyyy-MM-dd",
          );
        } else {
          dateStr = String(dateVal).trim();
        }
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          checkinDates.add(dateStr);
        }
      }
    }

    if (checkinDates.size === 0) return { currentStreak: 0, longestStreak: 0 };

    // Sort dates ascending
    const sortedDates = Array.from(checkinDates).sort();

    // Get today and yesterday (server timezone)
    const now = new Date();
    const today = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = Utilities.formatDate(
      yesterdayDate,
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );

    // === Calculate CURRENT STREAK ===
    let currentStreak = 0;

    if (checkinDates.has(today) || checkinDates.has(yesterday)) {
      // Start from today if checked in, else from yesterday
      const startDate = new Date(now);
      if (!checkinDates.has(today)) {
        startDate.setDate(startDate.getDate() - 1);
      }

      // Count consecutive days backwards
      const checkDate = new Date(startDate);
      while (true) {
        const checkStr = Utilities.formatDate(
          checkDate,
          "Asia/Ho_Chi_Minh",
          "yyyy-MM-dd",
        );
        if (checkinDates.has(checkStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    // If neither today nor yesterday has check-in → currentStreak stays 0

    // === Calculate LONGEST STREAK ===
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1] + "T00:00:00");
      const currDate = new Date(sortedDates[i] + "T00:00:00");
      const diffDays = Math.round(
        (currDate - prevDate) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    longestStreak = Math.max(longestStreak, currentStreak);

    Logger.log(
      `Streak from Checkin_History: current=${currentStreak}, longest=${longestStreak}, total days=${checkinDates.size}`,
    );

    return { currentStreak, longestStreak };
  } catch (error) {
    Logger.log(
      "Error calculating streak from Checkin_History: " + error.toString(),
    );
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Get user's streak data - calculated from Login_History
 * Also checks if user has checked in today
 * @returns {Object} - { success, currentStreak, longestStreak, lastActiveDate, checkedInToday }
 */
function getUserStreakData(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail) {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );

    // Calculate from Checkin_History
    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (progressSheetId) {
      try {
        const spreadsheet = SpreadsheetApp.openById(progressSheetId);
        const streakResult = calculateStreakFromCheckinHistory(spreadsheet);

        // Check if already checked in today (from Checkin_History sheet)
        const checkedInToday = hasCheckedInToday(spreadsheet, today);

        return {
          success: true,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastActiveDate: today,
          checkedInToday: checkedInToday,
          serverToday: today,
        };
      } catch (e) {
        Logger.log(
          "Error calculating streak from Checkin_History: " + e.toString(),
        );
      }
    }

    // Fallback: read from master DB
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return { success: false, message: "Users sheet not found" };
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const emailCol = headers.indexOf("email");
    const currentStreakCol = headers.indexOf("currentStreak");
    const longestStreakCol = headers.indexOf("longestStreak");
    const lastActiveCol = headers.indexOf("lastActiveDate");

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === userEmail) {
        const lastActive = data[i][lastActiveCol] || "";
        return {
          success: true,
          currentStreak: parseInt(data[i][currentStreakCol]) || 0,
          longestStreak: parseInt(data[i][longestStreakCol]) || 0,
          lastActiveDate: lastActive,
          checkedInToday: false,
        };
      }
    }

    return {
      success: true,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      checkedInToday: false,
    };
  } catch (error) {
    Logger.log("Error getting streak data: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Check if user has a check-in entry for today in Checkin_History sheet
 * @param {Spreadsheet} spreadsheet - User's personal spreadsheet
 * @param {string} today - Today's date YYYY-MM-DD
 * @returns {boolean}
 */
function hasCheckedInToday(spreadsheet, today) {
  try {
    const checkinSheet = spreadsheet.getSheetByName("Checkin_History");
    if (!checkinSheet) return false;

    const data = checkinSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const dateVal = data[i][0];
      let dateStr;
      if (dateVal instanceof Date) {
        dateStr = Utilities.formatDate(
          dateVal,
          "Asia/Ho_Chi_Minh",
          "yyyy-MM-dd",
        );
      } else {
        dateStr = String(dateVal).trim();
      }
      if (dateStr === today) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Daily check-in - called when user clicks "Điểm danh" button
 * Each day can only check in once. Saves to Checkin_History sheet.
 * Updates streak in master DB.
 *
 * @returns {Object} - { success, currentStreak, longestStreak, alreadyCheckedIn }
 */
function dailyCheckin(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail) {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "Không tìm thấy sheet cá nhân" };
    }

    const spreadsheet = SpreadsheetApp.openById(progressSheetId);
    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );

    // Get or create Checkin_History sheet
    let checkinSheet = spreadsheet.getSheetByName("Checkin_History");
    if (!checkinSheet) {
      Logger.log("Creating Checkin_History sheet...");
      checkinSheet = spreadsheet.insertSheet("Checkin_History");
      checkinSheet.appendRow([
        "date", // YYYY-MM-DD
        "checkinTime", // Full timestamp
      ]);

      // Style header
      const headerRange = checkinSheet.getRange(1, 1, 1, 2);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#6366F1");
      headerRange.setFontColor("white");
      checkinSheet.setFrozenRows(1);
    }

    // Check if already checked in today
    const data = checkinSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const dateVal = data[i][0];
      const dateStr =
        dateVal instanceof Date
          ? Utilities.formatDate(dateVal, "Asia/Ho_Chi_Minh", "yyyy-MM-dd")
          : String(dateVal).trim();
      if (dateStr === today) {
        Logger.log("Already checked in today: " + today);

        // Still return streak data
        const streakResult = calculateStreakFromCheckinHistory(spreadsheet);
        return {
          success: false,
          alreadyCheckedIn: true,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          serverToday: today,
          message: "Hôm nay bạn đã điểm danh rồi!",
        };
      }
    }

    // Save check-in
    const now = new Date();
    checkinSheet.appendRow([today, now.toISOString()]);
    SpreadsheetApp.flush(); // Ensure the appended row is visible to verifyQuestCompletion
    Logger.log("✅ Daily check-in saved for: " + today);

    // Also save to Login_History for streak calculation consistency
    saveLoginToPersonalSheet(progressSheetId, userEmail, now);

    // Update streak
    updateUserStreak(userEmail, today);

    if (typeof invalidateDashboardCachesByEmail === "function") {
      invalidateDashboardCachesByEmail(userEmail, false);
    }

    // === AUTO-AWARD CHECKIN XP ===
    // Reuse quest reward pipeline so XP_Log + totalXP are updated consistently.
    const xpResult = completeQuestAndAwardXP("daily_checkin", userContext);
    if (!xpResult.success && !xpResult.alreadyClaimed) {
      Logger.log(
        "⚠️ Check-in saved but failed to award XP: " +
          (xpResult.message || "unknown error"),
      );
    }

    // Return updated streak
    const streakResult = calculateStreakFromCheckinHistory(spreadsheet);

    // Build response with accurate XQP totals
    var xpAwarded = xpResult.success ? xpResult.xpAwarded || 0 : 0;
    var responseNewTotalXP = xpResult.newTotalXP;
    var responseNewTotalXQP = xpResult.newTotalXQP;

    // If XP wasn't awarded (already claimed), fetch current totals from master DB
    // so client doesn't get stale/zero values.
    if (!xpResult.success || !responseNewTotalXQP) {
      try {
        const masterDbId = DB_CONFIG.SPREADSHEET_ID || "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
        const masterSS = SpreadsheetApp.openById(masterDbId);
        
        // Fetch from User_Stats instead of Users, since XP is stored there
        const statsSheet = masterSS.getSheetByName("User_Stats");
        const usersSheet = masterSS.getSheetByName("Users");
        
        if (statsSheet && usersSheet) {
          // First, get userId from Users sheet
          let targetUserId = "";
          const usersData = usersSheet.getDataRange().getValues();
          const emailCol = usersData[0].indexOf("email");
          for (let i = 1; i < usersData.length; i++) {
            if (String(usersData[i][emailCol]).trim() === String(userEmail).trim()) {
              targetUserId = usersData[i][0];
              break;
            }
          }
          
          if (targetUserId) {
            // Then fetch XP/XQP from User_Stats
            const statsData = statsSheet.getDataRange().getValues();
            const xpCol = statsData[0].indexOf("totalXP");
            const xqpCol = statsData[0].indexOf("totalXQP");
            for (let i = 1; i < statsData.length; i++) {
              if (statsData[i][0] === targetUserId) {
                responseNewTotalXP = xpCol >= 0 ? (parseInt(statsData[i][xpCol]) || 0) : 0;
                responseNewTotalXQP = xqpCol >= 0 ? (parseInt(statsData[i][xqpCol]) || 0) : 0;
                break;
              }
            }
          }
        }
      } catch (fetchErr) {
        Logger.log("⚠️ Could not fetch current XQP for checkin response: " + fetchErr.toString());
      }
    }

    return {
      success: true,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      serverToday: today,
      xpAwarded: xpAwarded,
      newTotalXP: responseNewTotalXP || 0,
      newTotalXQP: responseNewTotalXQP || 0,
      message: "Điểm danh thành công!",
    };
  } catch (error) {
    Logger.log("Error in dailyCheckin: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
