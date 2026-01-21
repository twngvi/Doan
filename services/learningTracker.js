/**
 * Learning Time Tracker Service
 * Tracks user's daily learning time and manages streak system
 *
 * Requirements:
 * - Track time spent in: Lesson, Mindmap, Flashcard, Quiz
 * - Save daily learning time to user's personal Google Sheet
 * - Streak: consecutive days with >= 15 minutes of learning
 */

// ========================================
// DAILY LEARNING TIME FUNCTIONS
// ========================================

/**
 * Get or create Daily_Learning sheet in user's personal spreadsheet
 * @param {Spreadsheet} spreadsheet - User's spreadsheet
 * @returns {Sheet} - Daily_Learning sheet
 */
function getOrCreateDailyLearningSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("Daily_Learning");

  if (!sheet) {
    Logger.log("Creating Daily_Learning sheet...");
    sheet = spreadsheet.insertSheet("Daily_Learning");
    sheet.appendRow([
      "date", // YYYY-MM-DD
      "totalMinutes", // Total minutes learned today
      "lessonMinutes", // Time in lessons
      "mindmapMinutes", // Time viewing mindmaps
      "flashcardMinutes", // Time studying flashcards
      "quizMinutes", // Time playing quizzes
      "streakAchieved", // Whether 15min goal was reached
      "lastUpdated", // Timestamp
    ]);

    // Style header
    const headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5B6FF8");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Save learning time to user's personal sheet
 * Called from client when user spends time learning
 *
 * @param {Object} data - { minutes: number, activityType: string }
 * @returns {Object} - { success: boolean, dailyTotal: number, streakAchieved: boolean }
 */
function saveLearningTime(data) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "Không tìm thấy sheet cá nhân" };
    }

    const spreadsheet = SpreadsheetApp.openById(progressSheetId);
    const sheet = getOrCreateDailyLearningSheet(spreadsheet);

    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );
    const minutes = parseInt(data.minutes) || 0;
    const activityType = data.activityType || "lesson"; // lesson, mindmap, flashcard, quiz

    // Find today's row
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    let todayRowIndex = -1;

    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === today) {
        todayRowIndex = i + 1; // +1 because sheet is 1-indexed
        break;
      }
    }

    const now = new Date();

    if (todayRowIndex === -1) {
      // Create new row for today
      const newRow = [
        today, // date
        minutes, // totalMinutes
        activityType === "lesson" ? minutes : 0, // lessonMinutes
        activityType === "mindmap" ? minutes : 0, // mindmapMinutes
        activityType === "flashcard" ? minutes : 0, // flashcardMinutes
        activityType === "quiz" ? minutes : 0, // quizMinutes
        minutes >= 15, // streakAchieved
        now, // lastUpdated
      ];
      sheet.appendRow(newRow);

      // Update streak if first time reaching 15 min
      if (minutes >= 15) {
        updateUserStreak(userEmail, today);
      }

      return {
        success: true,
        dailyTotal: minutes,
        streakAchieved: minutes >= 15,
      };
    } else {
      // Update existing row
      const row = sheet.getRange(todayRowIndex, 1, 1, 8).getValues()[0];
      const currentTotal = parseInt(row[1]) || 0;
      const newTotal = currentTotal + minutes;

      // Update total
      sheet.getRange(todayRowIndex, 2).setValue(newTotal);

      // Update activity-specific column
      const activityColMap = {
        lesson: 3,
        mindmap: 4,
        flashcard: 5,
        quiz: 6,
      };
      const activityCol = activityColMap[activityType] || 3;
      const currentActivityMinutes = parseInt(row[activityCol - 1]) || 0;
      sheet
        .getRange(todayRowIndex, activityCol)
        .setValue(currentActivityMinutes + minutes);

      // Update lastUpdated
      sheet.getRange(todayRowIndex, 8).setValue(now);

      // Check if just reached 15 minutes (streak milestone)
      const wasAchieved = row[6] === true || row[6] === "TRUE";
      if (!wasAchieved && newTotal >= 15) {
        sheet.getRange(todayRowIndex, 7).setValue(true);
        updateUserStreak(userEmail, today);
      }

      return {
        success: true,
        dailyTotal: newTotal,
        streakAchieved: newTotal >= 15,
      };
    }
  } catch (error) {
    Logger.log("Error saving learning time: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get today's learning stats for current user
 * @returns {Object} - { success, dailyTotal, lessonMinutes, mindmapMinutes, flashcardMinutes, quizMinutes, streakAchieved }
 */
function getTodayLearningStats() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return {
        success: true,
        dailyTotal: 0,
        lessonMinutes: 0,
        mindmapMinutes: 0,
        flashcardMinutes: 0,
        quizMinutes: 0,
        streakAchieved: false,
      };
    }

    const spreadsheet = SpreadsheetApp.openById(progressSheetId);
    let sheet = spreadsheet.getSheetByName("Daily_Learning");

    if (!sheet) {
      return {
        success: true,
        dailyTotal: 0,
        lessonMinutes: 0,
        mindmapMinutes: 0,
        flashcardMinutes: 0,
        quizMinutes: 0,
        streakAchieved: false,
      };
    }

    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );
    const dataRange = sheet.getDataRange().getValues();

    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === today) {
        return {
          success: true,
          dailyTotal: parseInt(dataRange[i][1]) || 0,
          lessonMinutes: parseInt(dataRange[i][2]) || 0,
          mindmapMinutes: parseInt(dataRange[i][3]) || 0,
          flashcardMinutes: parseInt(dataRange[i][4]) || 0,
          quizMinutes: parseInt(dataRange[i][5]) || 0,
          streakAchieved:
            dataRange[i][6] === true || dataRange[i][6] === "TRUE",
        };
      }
    }

    return {
      success: true,
      dailyTotal: 0,
      lessonMinutes: 0,
      mindmapMinutes: 0,
      flashcardMinutes: 0,
      quizMinutes: 0,
      streakAchieved: false,
    };
  } catch (error) {
    Logger.log("Error getting today stats: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ========================================
// STREAK MANAGEMENT FUNCTIONS
// ========================================

/**
 * Update user's streak in master database
 * Called when user reaches 15 minutes for the day
 *
 * @param {string} email - User's email
 * @param {string} today - Today's date string YYYY-MM-DD
 */
function updateUserStreak(email, today) {
  try {
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
        const lastActive = data[i][lastActiveCol];
        let currentStreak = parseInt(data[i][currentStreakCol]) || 0;
        let longestStreak = parseInt(data[i][longestStreakCol]) || 0;

        // Calculate yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = Utilities.formatDate(
          yesterday,
          "Asia/Ho_Chi_Minh",
          "yyyy-MM-dd",
        );

        // Check if streak continues
        if (lastActive === yesterdayStr) {
          // Streak continues - increment
          currentStreak += 1;
        } else if (lastActive !== today) {
          // Streak broken - reset to 1
          currentStreak = 1;
        }
        // If lastActive === today, streak already counted today

        // Update longest streak
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }

        // Save to sheet
        if (currentStreakCol !== -1) {
          usersSheet
            .getRange(rowIndex, currentStreakCol + 1)
            .setValue(currentStreak);
        }
        if (longestStreakCol !== -1) {
          usersSheet
            .getRange(rowIndex, longestStreakCol + 1)
            .setValue(longestStreak);
        }
        if (lastActiveCol !== -1) {
          usersSheet.getRange(rowIndex, lastActiveCol + 1).setValue(today);
        }

        Logger.log(
          `Updated streak for ${email}: current=${currentStreak}, longest=${longestStreak}`,
        );
        break;
      }
    }
  } catch (error) {
    Logger.log("Error updating streak: " + error.toString());
  }
}

/**
 * Get user's streak data
 * @returns {Object} - { success, currentStreak, longestStreak, lastActiveDate }
 */
function getUserStreakData() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "Chưa đăng nhập" };
    }

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
        let currentStreak = parseInt(data[i][currentStreakCol]) || 0;

        // Check if streak is still valid (not broken)
        const today = Utilities.formatDate(
          new Date(),
          "Asia/Ho_Chi_Minh",
          "yyyy-MM-dd",
        );
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = Utilities.formatDate(
          yesterday,
          "Asia/Ho_Chi_Minh",
          "yyyy-MM-dd",
        );

        // If last active was not today or yesterday, streak is broken
        if (lastActive !== today && lastActive !== yesterdayStr) {
          currentStreak = 0;
        }

        return {
          success: true,
          currentStreak: currentStreak,
          longestStreak: parseInt(data[i][longestStreakCol]) || 0,
          lastActiveDate: lastActive,
        };
      }
    }

    return {
      success: true,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
  } catch (error) {
    Logger.log("Error getting streak data: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
