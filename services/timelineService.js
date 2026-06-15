/**
 * timelineService.js - Timeline & Smart Reminder System
 * 
 * Handles:
 * - Study Settings (daily goals, reminders)
 * - Dynamic Timeline Generation
 * - Daily Quests
 * - Streak Recovery
 */

/**
 * Get user study settings from Profile
 */
function getStudySettings(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail) return { success: false, message: "Chưa đăng nhập" };

    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const emailCol = headers.indexOf("email");
    const dailyGoalCol = headers.indexOf("dailyGoal");
    const emailReminderEnabledCol = headers.indexOf("emailReminderEnabled");
    const reminderTimesCol = headers.indexOf("reminderTimes");
    const reminderFrequencyCol = headers.indexOf("reminderFrequency");
    const reminderModeCol = headers.indexOf("reminderMode");
    const weeklyGoalCol = headers.indexOf("weeklyGoal");

    if (dailyGoalCol === -1) {
      // Schema not updated yet
      return {
        success: true,
        settings: {
          dailyGoal: 5,
          emailReminderEnabled: false,
          reminderTimes: ["20:00"],
          reminderFrequency: 1,
          reminderMode: 1,
          weeklyGoal: 30
        }
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === userEmail) {
        let reminderTimes = ["20:00"];
        try {
          if (data[i][reminderTimesCol]) {
            reminderTimes = JSON.parse(data[i][reminderTimesCol]);
          }
        } catch(e) {}

        let dailyTimeGoalCol = headers.indexOf("dailyTimeGoal");
        let dailyTimeGoal = 15;
        if (dailyTimeGoalCol !== -1 && data[i][dailyTimeGoalCol]) {
          dailyTimeGoal = parseInt(data[i][dailyTimeGoalCol]) || 15;
        }

        return {
          success: true,
          settings: {
            dailyGoal: parseInt(data[i][dailyGoalCol]) || 5,
            dailyTimeGoal: dailyTimeGoal,
            emailReminderEnabled: data[i][emailReminderEnabledCol] === true || data[i][emailReminderEnabledCol] === "TRUE",
            reminderTimes: reminderTimes,
            reminderFrequency: parseInt(data[i][reminderFrequencyCol]) || 1,
            reminderMode: parseInt(data[i][reminderModeCol]) || 1,
            weeklyGoal: parseInt(data[i][weeklyGoalCol]) || 30
          }
        };
      }
    }
    
    return { success: false, message: "User not found" };
  } catch(error) {
    Logger.log("Error getStudySettings: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Update user study settings
 */
function updateStudySettings(userContext, settings) {
  try {
    if (settings === undefined && userContext && userContext.settings) {
      settings = userContext.settings;
    }

    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail) return { success: false, message: "Chưa đăng nhập" };

    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const emailCol = headers.indexOf("email");
    const dailyGoalCol = headers.indexOf("dailyGoal");
    const emailReminderEnabledCol = headers.indexOf("emailReminderEnabled");
    const reminderTimesCol = headers.indexOf("reminderTimes");
    const reminderFrequencyCol = headers.indexOf("reminderFrequency");
    const reminderModeCol = headers.indexOf("reminderMode");
    const weeklyGoalCol = headers.indexOf("weeklyGoal");
    
    let dailyTimeGoalCol = headers.indexOf("dailyTimeGoal");
    if (dailyTimeGoalCol === -1) {
      dailyTimeGoalCol = headers.length;
      usersSheet.getRange(1, dailyTimeGoalCol + 1).setValue("dailyTimeGoal");
    }

    if (dailyGoalCol === -1) {
       return { success: false, message: "System updating... please try again later." };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === userEmail) {
        if (settings.dailyGoal !== undefined) usersSheet.getRange(i+1, dailyGoalCol+1).setValue(settings.dailyGoal);
        if (settings.dailyTimeGoal !== undefined) usersSheet.getRange(i+1, dailyTimeGoalCol+1).setValue(settings.dailyTimeGoal);
        if (settings.emailReminderEnabled !== undefined) usersSheet.getRange(i+1, emailReminderEnabledCol+1).setValue(settings.emailReminderEnabled);
        if (settings.reminderTimes !== undefined) usersSheet.getRange(i+1, reminderTimesCol+1).setValue(JSON.stringify(settings.reminderTimes));
        if (settings.reminderFrequency !== undefined) usersSheet.getRange(i+1, reminderFrequencyCol+1).setValue(settings.reminderFrequency);
        if (settings.reminderMode !== undefined) usersSheet.getRange(i+1, reminderModeCol+1).setValue(settings.reminderMode);
        if (settings.weeklyGoal !== undefined) usersSheet.getRange(i+1, weeklyGoalCol+1).setValue(settings.weeklyGoal);
        
        return { success: true, message: "Cập nhật thành công" };
      }
    }
    return { success: false, message: "User not found" };
  } catch(error) {
    return { success: false, message: error.toString() };
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
                  if (dStr === today) todayCompletedCount++;
              }
           }
        }
      }
    }

    // Filter unfinished
    let unfinished = allTopics.filter(t => !completedTopics.has(t.topicId));

    let timeline = {
      today: {
        goal: dailyGoal,
        completed: todayCompletedCount,
        lessons: unfinished.slice(0, Math.max(0, dailyGoal - todayCompletedCount))
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
   // To be implemented: Check DAILY_QUESTS sheet in user's DB.
   // If empty for today, generate 3 random tasks.
   return {
     success: true,
     quests: [
       { id: 3, title: "Học liên tục 15 phút", current: 5, target: 15, rewardXP: 30, rewardCoin: 5, isCompleted: false }
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
