/**
 * adminFunctions.js - Backend Functions for Admin Panel
 * 
 * C뿯½뿯½c h뿯½뿯½m server-side cho Admin qu뿯½뿯½뿯½n l뿯½뿯½ Users, Topics, Lessons
 */

// ========================================
// ADMIN ACCESS CONTROL
// ========================================

/**
 * Ki뿯½뿯½뿯ƽm tra user c뿯½뿯½ ph뿯½뿯½뿯½i admin kh뿯½뿯½ng
 */
function isUserAdmin(userId) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdIndex = headers.indexOf("userId");
    const roleIndex = headers.indexOf("role");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdIndex] === userId) {
        return data[i][roleIndex] === "ADMIN";
      }
    }
    return false;
  } catch (error) {
    Logger.log("Error checking admin: " + error.toString());
    return false;
  }
}

/**
 * Set role ADMIN cho m뿯½뿯½™t user (ch뿯½뿯½뿯½y th뿯½뿯½뿯½ c뿯½뿯½ng trong Apps Script Editor)
 * 
 * C뿯½뿯½ch d뿯½뿯½ng:
 * 1. M뿯½뿯½Ÿ Google Apps Script Editor
 * 2. Ch뿯½뿯½뿯½n function: setUserAsAdmin
 * 3. Ch뿯½뿯½뿯½y v뿯½뿯½ nh뿯½뿯½뿯½p email c뿯½뿯½뿯½a user c뿯½뿯½뿯½n set l뿯½뿯½m admin
 */
function setUserAsAdmin() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Set User as Admin",
    "Nh뿯½뿯½뿯½p EMAIL c뿯½뿯½뿯½a user c뿯½뿯½뿯½n set l뿯½뿯½m ADMIN:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const email = response.getResponseText().trim().toLowerCase();
  
  if (!email) {
    ui.alert("L뿯½뿯½—i", "Email kh뿯½뿯½ng 뿯½‘뿯½뿯½뿯½뿯½뿯½c 뿯½‘뿯½뿯½뿯ƽ tr뿯½뿯½‘ng!", ui.ButtonSet.OK);
    return;
  }
  
  const result = setUserRole(email, "ADMIN");
  
  if (result.success) {
    ui.alert("Th뿯½뿯½nh c뿯½뿯½ng!", result.message, ui.ButtonSet.OK);
  } else {
    ui.alert("L뿯½뿯½—i", result.message, ui.ButtonSet.OK);
  }
}

/**
 * Set role cho user (internal function)
 */
function setUserRole(email, role) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const roleIndex = headers.indexOf("role");
    
    if (emailIndex === -1 || roleIndex === -1) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y c뿯½뿯½™t email ho뿯½뿯½뿯½c role" };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex].toLowerCase() === email.toLowerCase()) {
        // T뿯½뿯½m th뿯½뿯½뿯½y user, c뿯½뿯½뿯½p nh뿯½뿯½뿯½t role
        sheet.getRange(i + 1, roleIndex + 1).setValue(role);
        Logger.log("Set " + email + " as " + role);
        return { 
          success: true, 
          message: "뿯½뿯½뿯½뿯½ set " + email + " th뿯½뿯½nh " + role + " th뿯½뿯½nh c뿯½뿯½ng!" 
        };
      }
    }
    
    return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y user v뿯½뿯½›i email: " + email };
  } catch (error) {
    Logger.log("Error setting user role: " + error.toString());
    return { success: false, message: "L뿯½뿯½—i: " + error.toString() };
  }
}

/**
 * T뿯½뿯½뿯½o t뿯½뿯½i kho뿯½뿯½뿯½n admin m뿯½뿯½›i (ch뿯½뿯½뿯½y 1 l뿯½뿯½뿯½n khi setup)
 */
function createAdminAccount() {
  const ui = SpreadsheetApp.getUi();
  
  // Prompt for email
  const emailResponse = ui.prompt(
    "T뿯½뿯½뿯½o Admin Account",
    "Nh뿯½뿯½뿯½p EMAIL cho t뿯½뿯½i kho뿯½뿯½뿯½n admin:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResponse.getResponseText().trim();
  
  // Prompt for password
  const passResponse = ui.prompt(
    "T뿯½뿯½뿯½o Admin Account",
    "Nh뿯½뿯½뿯½p PASSWORD cho t뿯½뿯½i kho뿯½뿯½뿯½n admin:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (passResponse.getSelectedButton() !== ui.Button.OK) return;
  const password = passResponse.getResponseText();
  
  // Prompt for display name
  const nameResponse = ui.prompt(
    "T뿯½뿯½뿯½o Admin Account",
    "Nh뿯½뿯½뿯½p T뿯½ŠN HI뿯½뿯½‚N TH뿯½뿯½Š:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;
  const displayName = nameResponse.getResponseText().trim() || "Admin";
  
  // Create admin account
  const result = createAdminUser(email, password, displayName);
  
  if (result.success) {
    ui.alert("Th뿯½뿯½nh c뿯½뿯½ng!", result.message, ui.ButtonSet.OK);
  } else {
    ui.alert("L뿯½뿯½—i", result.message, ui.ButtonSet.OK);
  }
}

/**
 * Internal function to create admin user
 */
function createAdminUser(email, password, displayName) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }
    
    // Check if email exists
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex].toLowerCase() === email.toLowerCase()) {
        return { success: false, message: "Email 뿯½‘뿯½뿯½ t뿯½뿯½“n t뿯½뿯½뿯½i!" };
      }
    }
    
    // Hash password
    const passwordHash = hashPassword(password);
    
    // Create new admin user
    const now = new Date();
    const userId = "USR_ADMIN_" + now.getTime();
    
    const values = {
      userId: userId,
      googleId: "",
      email: email,
      displayName: displayName,
      username: email.split("@")[0],
      passwordHash: passwordHash,
      avatarUrl: "",
      role: "ADMIN",
      isActive: true,
      createdAt: now,
      lastLogin: now,
      lastActiveDate: now,
      activeSessionId: "",
      activeSessionUpdatedAt: "",
      emailVerified: true,
      verificationToken: "",
      verificationExpires: "",
      playerId: "",
      progressSheetId: ""
    };
    
    const newRow = headers.map(function(header) {
      return values[header] !== undefined ? values[header] : "";
    });
    
    sheet.appendRow(newRow);
    
    Logger.log("Admin account created: " + email);
    
    return {
      success: true,
      message: "뿯½뿯½뿯½뿯½ t뿯½뿯½뿯½o t뿯½뿯½i kho뿯½뿯½뿯½n Admin th뿯½뿯½nh c뿯½뿯½ng!\nEmail: " + email + "\nPassword: [뿯½‘뿯½뿯½ nh뿯½뿯½뿯½p]"
    };
  } catch (error) {
    Logger.log("Error creating admin: " + error.toString());
    return { success: false, message: "L뿯½뿯½—i: " + error.toString() };
  }
}

// ========================================
// ADMIN DASHBOARD STATS
// ========================================

/**
 * L뿯½뿯½뿯½y th뿯½뿯½‘ng k뿯½뿯½ cho Admin Dashboard
 */
function getAdminDashboardStats() {
  try {
    const ss = getOrCreateDatabase();
    
    // Count users
    const usersSheet = ss.getSheetByName("Users");
    const totalUsers = usersSheet ? Math.max(0, usersSheet.getLastRow() - 1) : 0;
    
    // Count topics
    const topicsSheet = ss.getSheetByName("Topics");
    const totalTopics = topicsSheet ? Math.max(0, topicsSheet.getLastRow() - 1) : 0;
    
    // Count lessons (MCQ questions as proxy)
    const mcqSheet = ss.getSheetByName("MCQ_Questions");
    const totalLessons = mcqSheet ? Math.max(0, mcqSheet.getLastRow() - 1) : 0;
    
    // Active today (users with lastLogin = today)
    let activeToday = 0;
    if (usersSheet && usersSheet.getLastRow() > 1) {
      const data = usersSheet.getDataRange().getValues();
      const headers = data[0];
      const lastLoginIndex = headers.indexOf("lastLogin");
      const today = new Date().toDateString();
      
      for (let i = 1; i < data.length; i++) {
        const lastLogin = data[i][lastLoginIndex];
        if (lastLogin && new Date(lastLogin).toDateString() === today) {
          activeToday++;
        }
      }
    }
    
    return {
      success: true,
      data: {
        totalUsers: totalUsers,
        totalTopics: totalTopics,
        totalLessons: totalLessons,
        activeToday: activeToday
      }
    };
  } catch (error) {
    Logger.log("Error getting admin stats: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * L뿯½뿯½뿯½y th뿯½뿯½‘ng k뿯½뿯½ AI usage cho admin theo user/topic/model
 * @param {object=} options - { days: number }
 * @returns {object}
 */
function getAdminAIUsageStats(options) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message: (adminContext && adminContext.message) || "Kh뿯½뿯½ng th뿯½뿯½뿯ƽ x뿯½뿯½c th뿯½뿯½뿯½c quy뿯½뿯½뿯½n admin",
      };
    }

    const safeOptions = options || {};
    const days = Math.max(1, Math.min(90, parseInt(safeOptions.days, 10) || 7));
    const fromTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const usageSheet = getSheet("AI_Key_Usage_Logs");
    if (!usageSheet || usageSheet.getLastRow() <= 1) {
      return {
        success: true,
        data: {
          days: days,
          totalRequests: 0,
          successRequests: 0,
          failedRequests: 0,
          successRate: 0,
          avgDurationMs: 0,
          byUser: [],
          byTopic: [],
          byModel: [],
          recentErrors: [],
        },
      };
    }

    const allRows = usageSheet.getDataRange().getValues();
    const headers = allRows[0];

    const idx = {
      userId: headers.indexOf("userId"),
      topicId: headers.indexOf("topicId"),
      model: headers.indexOf("model"),
      status: headers.indexOf("status"),
      errorMessage: headers.indexOf("errorMessage"),
      durationMs: headers.indexOf("durationMs"),
      createdAt: headers.indexOf("createdAt"),
    };

    const usersSheet = getSheet("Users");
    const userNameMap = {};
    if (usersSheet && usersSheet.getLastRow() > 1) {
      const usersData = usersSheet.getDataRange().getValues();
      const userHeaders = usersData[0];
      const userIdCol = userHeaders.indexOf("userId");
      const displayNameCol = userHeaders.indexOf("displayName");
      const emailCol = userHeaders.indexOf("email");
      for (let i = 1; i < usersData.length; i++) {
        const uid = String(usersData[i][userIdCol] || "").trim();
        if (!uid) continue;
        userNameMap[uid] =
          String(usersData[i][displayNameCol] || "").trim() ||
          String(usersData[i][emailCol] || "").trim() ||
          uid;
      }
    }

    let totalRequests = 0;
    let successRequests = 0;
    let failedRequests = 0;
    let durationTotal = 0;
    let durationCount = 0;

    const byUser = {};
    const byTopic = {};
    const byModel = {};
    const recentErrors = [];

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const createdAt = parseAdminSheetDate(row[idx.createdAt]);
      if (!createdAt || createdAt.getTime() < fromTime) continue;

      const userId = String(row[idx.userId] || "UNKNOWN").trim() || "UNKNOWN";
      const topicId = String(row[idx.topicId] || "(none)").trim() || "(none)";
      const model = String(row[idx.model] || "(unknown)").trim() || "(unknown)";
      const status = String(row[idx.status] || "UNKNOWN").trim().toUpperCase();
      const errorMessage = String(row[idx.errorMessage] || "").trim();
      const durationMs = Number(row[idx.durationMs] || 0);

      totalRequests++;
      if (status === "SUCCESS") {
        successRequests++;
      } else {
        failedRequests++;
      }

      if (durationMs > 0) {
        durationTotal += durationMs;
        durationCount++;
      }

      if (!byUser[userId]) {
        byUser[userId] = { userId: userId, userName: userNameMap[userId] || userId, total: 0, success: 0, failed: 0 };
      }
      byUser[userId].total++;
      if (status === "SUCCESS") byUser[userId].success++;
      else byUser[userId].failed++;

      if (!byTopic[topicId]) {
        byTopic[topicId] = { topicId: topicId, total: 0, success: 0, failed: 0 };
      }
      byTopic[topicId].total++;
      if (status === "SUCCESS") byTopic[topicId].success++;
      else byTopic[topicId].failed++;

      if (!byModel[model]) {
        byModel[model] = { model: model, total: 0, success: 0, failed: 0 };
      }
      byModel[model].total++;
      if (status === "SUCCESS") byModel[model].success++;
      else byModel[model].failed++;

      if (status !== "SUCCESS" && errorMessage) {
        recentErrors.push({
          userId: userId,
          userName: userNameMap[userId] || userId,
          topicId: topicId,
          model: model,
          errorMessage: errorMessage,
          createdAt: createdAt.toISOString(),
        });
      }
    }

    const sortByTotalDesc = function (a, b) {
      return b.total - a.total;
    };

    const byUserList = Object.keys(byUser)
      .map(function (key) {
        const item = byUser[key];
        item.successRate = item.total > 0 ? Math.round((item.success / item.total) * 10000) / 100 : 0;
        return item;
      })
      .sort(sortByTotalDesc)
      .slice(0, 20);

    const byTopicList = Object.keys(byTopic)
      .map(function (key) {
        const item = byTopic[key];
        item.successRate = item.total > 0 ? Math.round((item.success / item.total) * 10000) / 100 : 0;
        return item;
      })
      .sort(sortByTotalDesc)
      .slice(0, 20);

    const byModelList = Object.keys(byModel)
      .map(function (key) {
        const item = byModel[key];
        item.successRate = item.total > 0 ? Math.round((item.success / item.total) * 10000) / 100 : 0;
        return item;
      })
      .sort(sortByTotalDesc)
      .slice(0, 20);

    recentErrors.sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const successRate =
      totalRequests > 0
        ? Math.round((successRequests / totalRequests) * 10000) / 100
        : 0;

    return {
      success: true,
      data: {
        days: days,
        totalRequests: totalRequests,
        successRequests: successRequests,
        failedRequests: failedRequests,
        successRate: successRate,
        avgDurationMs:
          durationCount > 0
            ? Math.round((durationTotal / durationCount) * 100) / 100
            : 0,
        byUser: byUserList,
        byTopic: byTopicList,
        byModel: byModelList,
        recentErrors: recentErrors.slice(0, 20),
      },
    };
  } catch (error) {
    Logger.log("Error getting AI usage stats: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Kh뿯½뿯½a ho뿯½뿯½뿯½c m뿯½뿯½Ÿ kh뿯½뿯½a t뿯½뿯½i kho뿯½뿯½뿯½n ng뿯½뿯½뿯½뿯½뿯½i d뿯½뿯½ng
 * @param {string} userId
 * @param {boolean} isBlocked - true n뿯½뿯½뿯½u mu뿯½뿯½‘n kh뿯½뿯½a (isActive = false), false n뿯½뿯½뿯½u mu뿯½뿯½‘n m뿯½뿯½Ÿ kh뿯½뿯½a (isActive = true)
 */
function toggleUserBlockStatus(userId, isBlocked) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: "Kh뿯½뿯½ng c뿯½뿯½ ng뿯½뿯½뿯½뿯½뿯½i d뿯½뿯½ng n뿯½뿯½o" };
    }

    const headers = data[0];
    const col = {
      userId: headers.indexOf("userId"),
      isActive: headers.indexOf("isActive"),
    };

    if (col.userId < 0 || col.isActive < 0) {
      return { success: false, message: "C뿯½뿯½뿯½u tr뿯½뿯½c c뿯½뿯½™t Users kh뿯½뿯½ng h뿯½뿯½뿯½p l뿯½뿯½‡" };
    }

    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][col.userId] === userId) {
        // C뿯½뿯½뿯½p nh뿯½뿯½뿯½t gi뿯½뿯½ tr뿯½뿯½‹ isActive
        sheet.getRange(i + 1, col.isActive + 1).setValue(!isBlocked);
        
        // N뿯½뿯½뿯½U B뿯½뿯½Š KH뿯½“A, X뿯½“A LU뿯½”N SESSION 뿯½뿯½뿯½뿯½‚ B뿯½뿯½Š V뿯½‚NG KH뿯½뿯½ŽI THI뿯½뿯½뿯½T B뿯½뿯½Š V뿯½뿯₽ TR뿯½뿯½NH L뿯½뿯½–I 뿯½뿯½뿯½‚NG NH뿯½뿯½뿯½P SAU N뿯½뿯₽Y
        if (isBlocked) {
          const activeSessionIdIndex = headers.indexOf("activeSessionId");
          if (activeSessionIdIndex >= 0) {
            sheet.getRange(i + 1, activeSessionIdIndex + 1).setValue("");
          }
        }
        
        found = true;
        break;
      }
    }

    if (!found) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y ng뿯½뿯½뿯½뿯½뿯½i d뿯½뿯½ng v뿯½뿯½›i ID: " + userId };
    }

    return { 
      success: true, 
      message: isBlocked ? "뿯½뿯½뿯½뿯½ kh뿯½뿯½a t뿯½뿯½i kho뿯½뿯½뿯½n th뿯½뿯½nh c뿯½뿯½ng" : "뿯½뿯½뿯½뿯½ m뿯½뿯½Ÿ kh뿯½뿯½a t뿯½뿯½i kho뿯½뿯½뿯½n th뿯½뿯½nh c뿯½뿯½ng" 
    };
  } catch (error) {
    Logger.log("Error toggling user block status: " + error.toString());
    return { success: false, message: "L뿯½뿯½—i h뿯½뿯½‡ th뿯½뿯½‘ng: " + error.toString() };
  }
}

/**
 * L뿯½뿯½뿯½y d뿯½뿯½뿯½ li뿯½뿯½‡u tr뿯½뿯½뿯½ng th뿯½뿯½i ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng users cho Admin Online Stats
 * Quy 뿯½뿯½뿯½뿯½›c:
 * - active: ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng trong 1 ph뿯½뿯½t
 * - idle: ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng trong 5 ph뿯½뿯½t
 * - offline: qu뿯½뿯½ 5 ph뿯½뿯½t ho뿯½뿯½뿯½c ch뿯½뿯½a c뿯½뿯½ ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng g뿯½뿯½뿯½n 뿯½‘뿯½뿯½y
 * - disabled: t뿯½뿯½i kho뿯½뿯½뿯½n b뿯½뿯½‹ kh뿯½뿯½a (isActive = false)
 */
function getAdminOnlineUsersData() {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }

    const lastSeenIndex = ensureUsersColumn(sheet, "lastSeenAt");

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        data: {
          users: [],
          activities: [],
          totalOnline: 0,
          totalAccounts: 0,
          activeNow: 0,
          idleUsers: 0,
          offlineUsers: 0,
          disabledUsers: 0,
        },
      };
    }

    const headers = data[0];
    const col = {
      userId: headers.indexOf("userId"),
      email: headers.indexOf("email"),
      displayName: headers.indexOf("displayName"),
      username: headers.indexOf("username"),
      avatarUrl: headers.indexOf("avatarUrl"),
      isActive: headers.indexOf("isActive"),
      role: headers.indexOf("role"),
      lastLogin: headers.indexOf("lastLogin"),
      lastActiveDate: headers.indexOf("lastActiveDate"),
      createdAt: headers.indexOf("createdAt"),
      lastSeenAt: lastSeenIndex,
    };

    const now = new Date();
    const ONLINE_WINDOW_MINUTES = 5;
    const ACTIVE_WINDOW_MINUTES = 1;

    const users = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      const role = col.role >= 0 ? String(row[col.role] || "").trim().toUpperCase() : "";
      if (role === "ADMIN") {
        continue;
      }

      let isAccountEnabled = true;
      if (col.isActive >= 0) {
        const isActiveFlag = row[col.isActive];
        if (
          isActiveFlag === false ||
          isActiveFlag === "false" ||
          isActiveFlag === "FALSE"
        ) {
          isAccountEnabled = false;
        }
      }

      const lastLogin =
        col.lastLogin >= 0 ? parseAdminSheetDate(row[col.lastLogin]) : null;
      const lastActive =
        col.lastActiveDate >= 0
          ? parseAdminSheetDate(row[col.lastActiveDate])
          : null;
      const lastSeenAt =
        col.lastSeenAt >= 0 ? parseAdminSheetDate(row[col.lastSeenAt]) : null;
      const createdAt =
        col.createdAt >= 0 ? parseAdminSheetDate(row[col.createdAt]) : null;

      const latestActivity = getLatestAdminDate(
        lastSeenAt,
        getLatestAdminDate(lastActive, lastLogin),
      );

      let minutesAgo = null;
      if (latestActivity) {
        minutesAgo = Math.floor((now.getTime() - latestActivity.getTime()) / 60000);
      }

      let status = "offline";
      if (!isAccountEnabled) {
        status = "disabled";
      } else if (minutesAgo !== null && minutesAgo <= ACTIVE_WINDOW_MINUTES) {
        status = "active";
      } else if (minutesAgo !== null && minutesAgo <= ONLINE_WINDOW_MINUTES) {
        status = "idle";
      }

      const displayName =
        (col.displayName >= 0 && row[col.displayName]) ||
        (col.username >= 0 && row[col.username]) ||
        (col.email >= 0 && row[col.email]) ||
        "Ng뿯½뿯½뿯½뿯½뿯½i d뿯½뿯½ng";

      const email = col.email >= 0 ? row[col.email] || "" : "";
      const avatarUrl =
        col.avatarUrl >= 0 && row[col.avatarUrl]
          ? row[col.avatarUrl]
          : (email ? getGravatarUrl(email) : "");

      users.push({
        id: col.userId >= 0 ? row[col.userId] || ("USR_" + i) : ("USR_" + i),
        name: displayName,
        email: email,
        avatar: avatarUrl,
        status: status,
        activity:
          status === "active"
            ? "뿯½뿯½ang ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng"
            : status === "idle"
              ? "T뿯½뿯½뿯½m kh뿯½뿯½ng ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng"
              : status === "disabled"
                ? "T뿯½뿯½i kho뿯½뿯½뿯½n 뿯½‘뿯½뿯½ b뿯½뿯½‹ kh뿯½뿯½a"
                : "Offline",
        loginTime: lastLogin ? lastLogin.toISOString() : "",
        lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : "",
        lastActivity: latestActivity
          ? latestActivity.toISOString()
          : (createdAt ? createdAt.toISOString() : ""),
        lastActivityMinutes: minutesAgo,
      });
    }

    users.sort(function(a, b) {
      const timeA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const timeB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return timeB - timeA;
    });

    const activeNow = users.filter(function(u) { return u.status === "active"; }).length;
    const idleUsers = users.filter(function(u) { return u.status === "idle"; }).length;
    const offlineUsers = users.filter(function(u) { return u.status === "offline"; }).length;
    const disabledUsers = users.filter(function(u) { return u.status === "disabled"; }).length;
    const totalOnline = activeNow + idleUsers;

    // Timeline 뿯½‘뿯½뿯½n gi뿯½뿯½뿯½n d뿯½뿯½뿯½a tr뿯½뿯½n ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng g뿯½뿯½뿯½n nh뿯½뿯½뿯½t
    const activities = users
      .filter(function(u) { return u.status === "active" || u.status === "idle"; })
      .slice(0, 10)
      .map(function(u) {
      return {
        type: u.status === "active" ? "activity" : "login",
        user: u.name,
        action: u.status === "active" ? "뿯½‘ang ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng" : "v뿯½뿯½뿯½a online",
        time: u.lastActivity,
      };
      });

    return {
      success: true,
      data: {
        users: users,
        activities: activities,
        totalOnline: totalOnline,
        totalAccounts: users.length,
        activeNow: activeNow,
        idleUsers: idleUsers,
        offlineUsers: offlineUsers,
        disabledUsers: disabledUsers,
      },
    };
  } catch (error) {
    Logger.log("Error getting admin online users: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * L뿯½뿯½뿯½y d뿯½뿯½뿯½ li뿯½뿯½‡u th뿯½뿯½‘ng k뿯½뿯½ h뿯½뿯½뿯½c t뿯½뿯½뿯½p/ng뿯½뿯½뿯½뿯½뿯½i ch뿯½뿯½i cho trang Admin User Stats.
 * Tr뿯½뿯½뿯½ v뿯½뿯½뿯½ format t뿯½뿯½뿯½뿯½ng th뿯½뿯½ch v뿯½뿯½›i views/admin/userStats/user_stats_scripts.html
 */
function getCourseLearnerCount(courseId) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) return { success: false, message: "No admin auth" };
    
    // Đọc nhanh từ cache nếu có
    const cache = CacheService.getScriptCache();
    const cacheKey = "COURSE_LEARNER_COUNT_" + courseId;
    const cached = cache.get(cacheKey);
    if (cached) return { success: true, count: parseInt(cached, 10) };
    
    // Gọi tạm getAdminUserLearningStats để đếm
    const stats = getAdminUserLearningStats({ maxUsers: 200 });
    if (!stats || !stats.success) return { success: false, count: 0 };
    
    let count = 0;
    stats.data.forEach(function(user) {
      let learning = false;
      if (user.lessons) {
        user.lessons.forEach(function(l) { if (String(l.courseId) === String(courseId)) learning = true; });
      }
      if (user.attempts) {
        user.attempts.forEach(function(a) { if (String(a.courseId) === String(courseId)) learning = true; });
      }
      if (learning) count++;
    });
    
    cache.put(cacheKey, count.toString(), 600);
    return { success: true, count: count };
  } catch (e) {
    return { success: false, count: 0 };
  }
}

function getAdminUserLearningStats(options) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message:
          (adminContext && adminContext.message) ||
          "Kh뿯½뿯½ng th뿯½뿯½뿯ƽ x뿯½뿯½c th뿯½뿯½뿯½c quy뿯½뿯½뿯½n admin",
      };
    }

    const safeOptions = options || {};
    const maxUsers = Math.max(1, Math.min(300, parseInt(safeOptions.maxUsers, 10) || 200));

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }

    const usersData = usersSheet.getDataRange().getValues();
    if (usersData.length <= 1) {
      return { success: true, data: [] };
    }

    const usersHeaders = usersData[0];
    const userCols = {
      userId: usersHeaders.indexOf("userId"),
      email: usersHeaders.indexOf("email"),
      displayName: usersHeaders.indexOf("displayName"),
      username: usersHeaders.indexOf("username"),
      role: usersHeaders.indexOf("role"),
      progressSheetId: usersHeaders.indexOf("progressSheetId"),
      createdAt: usersHeaders.indexOf("createdAt"),
    };

    const topicInfoMap = getAdminTopicInfoMap_();
    const result = [];
    const totalTopicsInDb = getAdminTotalTopicsCount_();

    for (let i = 1; i < usersData.length; i++) {
      if (result.length >= maxUsers) break;

      const row = usersData[i];
      const role =
        userCols.role >= 0 ? String(row[userCols.role] || "").trim().toUpperCase() : "";

      // Ch뿯½뿯½‰ th뿯½뿯½‘ng k뿯½뿯½ t뿯½뿯½i kho뿯½뿯½뿯½n c뿯½뿯½ vai tr뿯½뿯½ USER.
      if (role !== "USER") {
        continue;
      }

      const userId =
        userCols.userId >= 0 && row[userCols.userId]
          ? String(row[userCols.userId]).trim()
          : "USR_" + i;
      const email =
        userCols.email >= 0 && row[userCols.email]
          ? String(row[userCols.email]).trim()
          : "";
      const displayName =
        (userCols.displayName >= 0 && row[userCols.displayName]) ||
        (userCols.username >= 0 && row[userCols.username]) ||
        email ||
        userId ||
        "Người dùng";
      const progressSheetId =
        userCols.progressSheetId >= 0 && row[userCols.progressSheetId]
          ? String(row[userCols.progressSheetId]).trim()
          : "";

      const userItem = {
        id: userId,
        name: String(displayName),
        email: email,
        lessons: [],
        attempts: [],
        plays: [],
      };

      if (!progressSheetId) {
        result.push(userItem);
        continue;
      }

      try {
        const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
        const lessonMap = {};
        const rawAttempts = [];
        const playsMap = {};

        // 1) Topic progress -> lessons base data
        const topicProgressSheet = userSpreadsheet.getSheetByName("Topic_Progress");
        if (topicProgressSheet && topicProgressSheet.getLastRow() > 1) {
          const tpData = topicProgressSheet.getDataRange().getValues();
          const tpHeaders = tpData[0];
          const tpCols = {
            topicId: tpHeaders.indexOf("topicId"),
            topicTitle: tpHeaders.indexOf("topicTitle"),
            progress: tpHeaders.indexOf("progress"),
            attempts: tpHeaders.indexOf("attempts"),
            lessonCompleted: tpHeaders.indexOf("lessonCompleted"),
            mindmapViewed: tpHeaders.indexOf("mindmapViewed"),
            flashcardsCompleted: tpHeaders.indexOf("flashcardsCompleted"),
            miniQuizCompleted: tpHeaders.indexOf("miniQuizCompleted"),
          };

          for (let r = 1; r < tpData.length; r++) {
            const tpRow = tpData[r];
            const topicId =
              tpCols.topicId >= 0 && tpRow[tpCols.topicId]
                ? String(tpRow[tpCols.topicId]).trim()
                : "";
            if (!topicId) continue;

            const topicTitleFromRow =
              tpCols.topicTitle >= 0 ? String(tpRow[tpCols.topicTitle] || "").trim() : "";
            const topicInfo = topicInfoMap[topicId] || {};
            const topicTitle = topicTitleFromRow || topicInfo.title || topicId;
            const courseId = topicInfo.courseId || "";
            const courseTitle = topicInfo.courseTitle || courseId;

            let progressPercent = 0;
            if (tpCols.lessonCompleted >= 0) {
              let completedParts = 0;
              if (isAdminTruthy_(tpRow[tpCols.lessonCompleted])) completedParts++;
              if (tpCols.mindmapViewed >= 0 && isAdminTruthy_(tpRow[tpCols.mindmapViewed])) completedParts++;
              if (tpCols.flashcardsCompleted >= 0 && isAdminTruthy_(tpRow[tpCols.flashcardsCompleted])) completedParts++;
              if (tpCols.miniQuizCompleted >= 0 && isAdminTruthy_(tpRow[tpCols.miniQuizCompleted])) completedParts++;
              progressPercent = Math.round((completedParts / 4) * 100);
            } else if (tpCols.progress >= 0) {
              progressPercent = clampAdminPercent_(tpRow[tpCols.progress]);
            }

            lessonMap[topicId] = {
              lessonId: topicId,
              lessonTitle: topicTitle,
              courseId: courseId,
              courseTitle: courseTitle,
              progressPercent: progressPercent,
              attemptCount: 0,
              avgScore: 0,
              _scoreSum: 0,
              _scoreCount: 0,
            };
          }
        }

        // 2) Quiz results -> attempts + lesson score aggregation + plays
        const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");
        if (quizSheet && quizSheet.getLastRow() > 1) {
          const qData = quizSheet.getDataRange().getValues();
          const qHeaders = qData[0];
          const qCols = {
            id: qHeaders.indexOf("id"),
            topicId: qHeaders.indexOf("topicId"),
            topicTitle: qHeaders.indexOf("topicTitle"),
            score: qHeaders.indexOf("score"),
            totalQuestions: qHeaders.indexOf("totalQuestions"),
            percentage: qHeaders.indexOf("percentage"),
            status: qHeaders.indexOf("status"),
            completedAt: qHeaders.indexOf("completedAt"),
            gameMode: qHeaders.indexOf("gameMode"),
            questionDetails: qHeaders.indexOf("questionDetails"),
          };

          for (let r = 1; r < qData.length; r++) {
            const qRow = qData[r];
            const status = qCols.status >= 0 ? String(qRow[qCols.status] || "").toLowerCase() : "complete";
            if (status === "partial") continue;

            const topicId =
              qCols.topicId >= 0 && qRow[qCols.topicId]
                ? String(qRow[qCols.topicId]).trim()
                : "";
            const rowTopicTitle = qCols.topicTitle >= 0 ? String(qRow[qCols.topicTitle] || "").trim() : "";
            const topicInfo = topicInfoMap[topicId] || {};
            const topicTitle = rowTopicTitle || topicInfo.title || topicId || "Quiz";
            const courseId = topicInfo.courseId || "";
            const courseTitle = topicInfo.courseTitle || courseId;

            const percentage =
              qCols.percentage >= 0
                ? clampAdminPercent_(qRow[qCols.percentage])
                : deriveQuizPercent_(qCols.score >= 0 ? qRow[qCols.score] : 0, qCols.totalQuestions >= 0 ? qRow[qCols.totalQuestions] : 0);
            const correctAnswers = qCols.score >= 0 ? Math.max(0, parseInt(qRow[qCols.score], 10) || 0) : 0;
            const totalQuestions = qCols.totalQuestions >= 0 ? Math.max(0, parseInt(qRow[qCols.totalQuestions], 10) || 0) : 0;
            const quizMode = qCols.gameMode >= 0 && qRow[qCols.gameMode]
              ? String(qRow[qCols.gameMode]).trim().toLowerCase()
              : "instant";
            const isCountableQuizAttempt =
              quizMode === "review" || quizMode === "instant";

            const completedAtDate =
              qCols.completedAt >= 0 ? parseAdminSheetDate(qRow[qCols.completedAt]) : null;
            const completedAtIso = completedAtDate ? completedAtDate.toISOString() : "";

            rawAttempts.push({
              resultId: qCols.id >= 0 ? String(qRow[qCols.id] || "") : "",
              topicId: topicId,
              lessonTitle: topicTitle,
              score: percentage,
              correctAnswers: correctAnswers,
              totalQuestions: totalQuestions,
              activityType: "quiz",
              quizMode: quizMode,
              detailRaw:
                qCols.questionDetails >= 0 ? qRow[qCols.questionDetails] : null,
              completedAt: completedAtIso,
              courseId: courseId,
              courseTitle: courseTitle,
            });

            if (topicId) {
              if (!lessonMap[topicId]) {
                lessonMap[topicId] = {
                  lessonId: topicId,
                  lessonTitle: topicTitle,
                  courseId: courseId,
                  courseTitle: courseTitle,
                  progressPercent: 0,
                  attemptCount: 0,
                  avgScore: 0,
                  _scoreSum: 0,
                  _scoreCount: 0,
                };
              }
              if (isCountableQuizAttempt) {
                lessonMap[topicId].attemptCount++;
              }
              lessonMap[topicId]._scoreSum += percentage;
              lessonMap[topicId]._scoreCount += 1;
            }

            const mode = qCols.gameMode >= 0 && qRow[qCols.gameMode]
              ? String(qRow[qCols.gameMode]).trim().toUpperCase()
              : "MCQ";
            const playKey = "quiz|" + mode + "|" + (topicId || topicTitle);
            if (!playsMap[playKey]) {
              playsMap[playKey] = {
                mode: mode || "MCQ",
                topicId: topicId,
                topicTitle: topicTitle,
                courseId: courseId,
                courseTitle: courseTitle,
                playCount: 0,
                bestScore: 0,
                playedAt: completedAtIso,
              };
            }
            playsMap[playKey].playCount++;
            playsMap[playKey].bestScore = Math.max(playsMap[playKey].bestScore, percentage);
            if (completedAtDate) {
              const currentPlayedAt = parseAdminSheetDate(playsMap[playKey].playedAt);
              if (!currentPlayedAt || completedAtDate.getTime() > currentPlayedAt.getTime()) {
                playsMap[playKey].playedAt = completedAtIso;
              }
            }
          }
        }

        // 3) Matching results -> plays
        const matchingSheet = userSpreadsheet.getSheetByName("Matching_Results");
        if (matchingSheet && matchingSheet.getLastRow() > 1) {
          const mData = matchingSheet.getDataRange().getValues();
          const mHeaders = mData[0];
          const mCols = {
            id: mHeaders.indexOf("id"),
            topicId: mHeaders.indexOf("topicId"),
            topicTitle: mHeaders.indexOf("topicTitle"),
            totalPairs: mHeaders.indexOf("totalPairs"),
            correctPairs: mHeaders.indexOf("correctPairs"),
            score: mHeaders.indexOf("score"),
            completed: mHeaders.indexOf("completed"),
            accuracy: mHeaders.indexOf("accuracy"),
            playedAt: mHeaders.indexOf("playedAt"),
            pairDetails: mHeaders.indexOf("pairDetails"),
          };

          for (let r = 1; r < mData.length; r++) {
            const mRow = mData[r];
            if (mCols.completed >= 0 && !isAdminTruthy_(mRow[mCols.completed])) {
              continue;
            }

            const topicId =
              mCols.topicId >= 0 && mRow[mCols.topicId]
                ? String(mRow[mCols.topicId]).trim()
                : "";
            const rowTopicTitle = mCols.topicTitle >= 0 ? String(mRow[mCols.topicTitle] || "").trim() : "";
            const topicInfo = topicInfoMap[topicId] || {};
            const topicTitle = rowTopicTitle || topicInfo.title || topicId || "Matching";
            const courseId = topicInfo.courseId || "";
            const courseTitle = topicInfo.courseTitle || courseId;
            const accuracy = mCols.accuracy >= 0 ? clampAdminPercent_(mRow[mCols.accuracy]) : 0;
            const totalPairs = mCols.totalPairs >= 0 ? Math.max(0, parseInt(mRow[mCols.totalPairs], 10) || 0) : 0;
            const correctPairs = mCols.correctPairs >= 0 ? Math.max(0, parseInt(mRow[mCols.correctPairs], 10) || 0) : 0;
            const score = mCols.score >= 0 ? Math.max(0, parseInt(mRow[mCols.score], 10) || 0) : accuracy;

            const playedAtDate = mCols.playedAt >= 0 ? parseAdminSheetDate(mRow[mCols.playedAt]) : null;
            const playedAtIso = playedAtDate ? playedAtDate.toISOString() : "";

            rawAttempts.push({
              resultId: mCols.id >= 0 ? String(mRow[mCols.id] || "") : "",
              topicId: topicId,
              lessonTitle: topicTitle,
              score: score,
              correctAnswers: correctPairs,
              totalQuestions: totalPairs,
              activityType: "matching",
              quizMode: "matching",
              accuracy: accuracy,
              detailRaw: mCols.pairDetails >= 0 ? mRow[mCols.pairDetails] : null,
              completedAt: playedAtIso,
              courseId: courseId,
              courseTitle: courseTitle,
            });

            if (topicId) {
              if (!lessonMap[topicId]) {
                lessonMap[topicId] = {
                  lessonId: topicId,
                  lessonTitle: topicTitle,
                  courseId: courseId,
                  courseTitle: courseTitle,
                  progressPercent: 0,
                  attemptCount: 0,
                  avgScore: 0,
                  _scoreSum: 0,
                  _scoreCount: 0,
                };
              }
              lessonMap[topicId].attemptCount++;
            }

            const playKey = "matching|" + (topicId || topicTitle);
            if (!playsMap[playKey]) {
              playsMap[playKey] = {
                mode: "Matching",
                topicId: topicId,
                topicTitle: topicTitle,
                courseId: courseId,
                courseTitle: courseTitle,
                playCount: 0,
                bestScore: 0,
                playedAt: playedAtIso,
              };
            }
            playsMap[playKey].playCount++;
            playsMap[playKey].bestScore = Math.max(playsMap[playKey].bestScore, accuracy);

            if (playedAtDate) {
              const currentPlayedAt = parseAdminSheetDate(playsMap[playKey].playedAt);
              if (!currentPlayedAt || playedAtDate.getTime() > currentPlayedAt.getTime()) {
                playsMap[playKey].playedAt = playedAtIso;
              }
            }
          }
        }

        // Finalize lessons
        const lessons = Object.keys(lessonMap)
          .map(function (topicId) {
            const lesson = lessonMap[topicId];
            if (lesson._scoreCount > 0) {
              lesson.avgScore = Math.round((lesson._scoreSum / lesson._scoreCount) * 100) / 100;
            }
            delete lesson._scoreSum;
            delete lesson._scoreCount;
            return lesson;
          })
          .sort(function (a, b) {
            if (b.progressPercent !== a.progressPercent) {
              return b.progressPercent - a.progressPercent;
            }
            return String(a.lessonTitle || "").localeCompare(String(b.lessonTitle || ""));
          });

        // Finalize attempts timeline (quiz + matching)
        rawAttempts.sort(function (a, b) {
          return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
        });

        const attemptNumberByTopic = {};
        const attempts = rawAttempts
          .map(function (attempt) {
            const key = attempt.topicId || attempt.lessonTitle || "UNKNOWN";
            attemptNumberByTopic[key] = (attemptNumberByTopic[key] || 0) + 1;
            return {
              resultId: attempt.resultId || "",
              completedAt: attempt.completedAt,
              lessonId: attempt.topicId || "",
              lessonTitle: attempt.lessonTitle || attempt.topicId || "Quiz",
              courseId: attempt.courseId || "",
              courseTitle: attempt.courseTitle || attempt.courseId || "Course",
              attemptNumber: attemptNumberByTopic[key],
              score: attempt.score,
              correctAnswers: attempt.correctAnswers,
              totalQuestions: attempt.totalQuestions,
              activityType: attempt.activityType || "quiz",
              quizMode: attempt.quizMode,
              accuracy: attempt.accuracy,
              detail: parseAdminAttemptDetail_(
                attempt.detailRaw,
                attempt.activityType,
              ),
            };
          })
          .sort(function (a, b) {
            return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
          });

        const plays = Object.keys(playsMap)
          .map(function (key) {
            return playsMap[key];
          })
          .sort(function (a, b) {
            return new Date(b.playedAt || 0).getTime() - new Date(a.playedAt || 0).getTime();
          });

        userItem.lessons = lessons;
        userItem.attempts = attempts;
        userItem.plays = plays;
      } catch (userError) {
        Logger.log(
          "Error aggregating user stats for " + userId + ": " + userError.toString(),
        );
      }

      result.push(userItem);
    }

    return {
      success: true,
      data: result,
      meta: {
        totalUsers: result.length,
        totalTopicsInDb: totalTopicsInDb,
      },
    };
  } catch (error) {
    Logger.log("Error getting admin user learning stats: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function getAdminTotalTopicsCount_() {
  try {
    const topicsSheet = getSheet("Topics");
    if (!topicsSheet || topicsSheet.getLastRow() <= 1) return 0;

    const data = topicsSheet.getDataRange().getValues();
    if (!data.length) return 0;

    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    if (topicIdCol < 0) {
      return Math.max(0, data.length - 1);
    }

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const topicId = String(data[i][topicIdCol] || "").trim();
      if (topicId) count++;
    }

    return count;
  } catch (error) {
    Logger.log("Error counting total topics: " + error.toString());
    return 0;
  }
}

function getAdminTopicInfoMap_() {
  const map = {};

  try {
    const topicsSheet = getSheet("Topics");
    if (!topicsSheet || topicsSheet.getLastRow() <= 1) return map;

    const data = topicsSheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const titleCol = headers.indexOf("title");
    const courseIdCol = headers.indexOf("courseId");
    
    const courseTitleMap = getAdminCourseTitleMap_();

    for (let i = 1; i < data.length; i++) {
      const topicId = topicIdCol >= 0 ? String(data[i][topicIdCol] || "").trim() : "";
      if (!topicId) continue;
      const title = titleCol >= 0 ? String(data[i][titleCol] || "").trim() : "";
      const courseId = courseIdCol >= 0 ? String(data[i][courseIdCol] || "").trim() : "";
      const courseTitle = courseTitleMap[courseId] || courseId;
      map[topicId] = { title: title || topicId, courseId: courseId, courseTitle: courseTitle };
    }
  } catch (error) {
    Logger.log("Error building topic info map: " + error.toString());
  }

  return map;
}

function getAdminCourseTitleMap_() {
  const map = {};
  try {
    const coursesSheet = getSheet("Courses");
    if (!coursesSheet || coursesSheet.getLastRow() <= 1) return map;

    const data = coursesSheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("courseId");
    const titleCol = headers.indexOf("title");

    for (let i = 1; i < data.length; i++) {
      const courseId = idCol >= 0 ? String(data[i][idCol] || "").trim() : "";
      if (!courseId) continue;
      const title = titleCol >= 0 ? String(data[i][titleCol] || "").trim() : "";
      map[courseId] = title || courseId;
    }
  } catch (error) {
    Logger.log("Error building course title map: " + error.toString());
  }
  return map;
}

function isAdminTruthy_(value) {
  return value === true || value === 1 || value === "1" || value === "TRUE" || value === "true";
}

function clampAdminPercent_(value) {
  const n = Number(value || 0);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function deriveQuizPercent_(score, totalQuestions) {
  const s = Number(score || 0);
  const t = Number(totalQuestions || 0);
  if (!t || isNaN(s) || isNaN(t)) return 0;
  return clampAdminPercent_(Math.round((s / t) * 100));
}

/**
 * Heartbeat t뿯½뿯½뿯½ client 뿯½‘뿯½뿯½뿯ƽ ghi nh뿯½뿯½뿯½n user c뿯½뿯½n 뿯½‘ang m뿯½뿯½Ÿ web
 * payload: { userId?: string, email?: string, page?: string }
 */
function updateUserHeartbeat(payload) {
  try {
    const safePayload = payload || {};
    const userId = String(safePayload.userId || "").trim();
    const sessionId = String(safePayload.sessionId || "").trim();

    if (!userId || !sessionId) {
      return {
        success: false,
        message: "Missing userId or sessionId",
      };
    }

    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }

    const lastSeenIndex = ensureUsersColumn(sheet, "lastSeenAt");
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: "Kh뿯½뿯½ng c뿯½뿯½ d뿯½뿯½뿯½ li뿯½뿯½‡u ng뿯½뿯½뿯½뿯½뿯½i d뿯½뿯½ng" };
    }

    const headers = data[0];
    const userIdIndex = headers.indexOf("userId");
    const activeSessionIdIndex = headers.indexOf("activeSessionId");
    const activeSessionUpdatedAtIndex = headers.indexOf("activeSessionUpdatedAt");
    const isActiveIndex = headers.indexOf("isActive");

    if (userIdIndex === -1 || activeSessionIdIndex === -1 || activeSessionUpdatedAtIndex === -1) {
      return {
        success: false,
        message: "Missing session columns",
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][userIdIndex]) === userId) {
        if (isActiveIndex >= 0) {
          const isActiveFlag = data[i][isActiveIndex];
          if (
            isActiveFlag === false ||
            isActiveFlag === "false" ||
            isActiveFlag === "FALSE"
          ) {
            return { success: false, message: "T뿯½뿯½i kho뿯½뿯½뿯½n 뿯½‘ang b뿯½뿯½‹ kh뿯½뿯½a" };
          }
        }

        const activeSessionId = String(data[i][activeSessionIdIndex] || "");

        // Ch뿯½뿯½‰ c뿯½뿯½뿯½p nh뿯½뿯½뿯½t heartbeat n뿯½뿯½뿯½u 뿯½‘뿯½뿯½ng phi뿯½뿯½n hi뿯½뿯½‡n t뿯½뿯½뿯½i
        // Tr뿯½뿯½nh tab c뿯½뿯½ ghi 뿯½‘뿯½뿯½ tr뿯½뿯½뿯½ng th뿯½뿯½i c뿯½뿯½뿯½a tab m뿯½뿯½›i
        if (activeSessionId !== sessionId) {
          return {
            success: false,
            status: "STALE_SESSION",
            message: "Session kh뿯½뿯½ng c뿯½뿯½n h뿯½뿯½뿯½p l뿯½뿯½‡",
          };
        }

        const now = new Date();
        sheet.getRange(i + 1, activeSessionUpdatedAtIndex + 1).setValue(now);
        sheet.getRange(i + 1, lastSeenIndex + 1).setValue(now);

        return {
          success: true,
          message: "Heartbeat updated",
        };
      }
    }

    return {
      success: false,
      message: "User not found",
    };
  } catch (error) {
    Logger.log("Error in updateUserHeartbeat: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Parse d뿯½뿯½뿯½ li뿯½뿯½‡u ng뿯½뿯½y t뿯½뿯½뿯½ sheet (Date object ho뿯½뿯½뿯½c string)
 */
function parseAdminSheetDate(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseAdminAttemptDetail_(value, activityType) {
  if (!value) return null;

  let parsedValue = value;
  if (typeof parsedValue === "string") {
    const raw = parsedValue.trim();
    if (!raw) return null;
    try {
      parsedValue = JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  const type = String(activityType || "").toLowerCase();

  if (type === "quiz" && Array.isArray(parsedValue)) {
    return parsedValue.slice(0, 200).map(function (item) {
      const safe = item || {};
      return {
        question: safe.question || "",
        userAnswer: safe.userAnswer,
        userAnswerText: safe.userAnswerText || "",
        correctAnswer: safe.correctAnswer,
        correctAnswerText: safe.correctAnswerText || "",
        isCorrect: safe.isCorrect === true,
      };
    });
  }

  if (type === "matching" && Array.isArray(parsedValue)) {
    return parsedValue.slice(0, 200).map(function (item) {
      const safe = item || {};
      return {
        leftText: safe.leftText || safe.left || safe.term || "",
        userMatch: safe.userMatch || safe.userAnswer || safe.selected || "",
        correctMatch: safe.correctMatch || safe.correctAnswer || safe.correct || "",
        isCorrect: safe.isCorrect === true,
      };
    });
  }

  return parsedValue;
}

/**
 * L뿯½뿯½뿯½y Date m뿯½뿯½›i nh뿯½뿯½뿯½t trong 2 gi뿯½뿯½ tr뿯½뿯½‹
 */
function getLatestAdminDate(dateA, dateB) {
  if (dateA && dateB) {
    return dateA.getTime() >= dateB.getTime() ? dateA : dateB;
  }
  return dateA || dateB || null;
}

/**
 * 뿯½뿯½뿯½뿯½뿯½m b뿯½뿯½뿯½o c뿯½뿯½™t t뿯½뿯½“n t뿯½뿯½뿯½i trong Users header, t뿯½뿯½뿯½o m뿯½뿯½›i 뿯½뿯½Ÿ cu뿯½뿯½‘i n뿯½뿯½뿯½u thi뿯½뿯½뿯½u
 */
function ensureUsersColumn(sheet, columnName) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0] || [];
  let index = headers.indexOf(columnName);
  if (index !== -1) return index;

  const newColumn = headers.length + 1;
  sheet.getRange(1, newColumn).setValue(columnName);
  return newColumn - 1;
}

// ========================================
// USER MANAGEMENT
// ========================================

/**
 * L뿯½뿯½뿯½y danh s뿯½뿯½ch t뿯½뿯½뿯½t c뿯½뿯½뿯½ users cho Admin
 */
function getAllUsersForAdmin() {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    const headers = data[0];
    const users = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      users.push({
        userId: row[headers.indexOf("userId")],
        email: row[headers.indexOf("email")],
        displayName: row[headers.indexOf("displayName")],
        username: row[headers.indexOf("username")],
        avatarUrl: row[headers.indexOf("avatarUrl")],
        role: row[headers.indexOf("role")] || "USER",
        level: row[headers.indexOf("level")] || 1,
        totalPoints: row[headers.indexOf("totalPoints")] || 0,
        isActive: row[headers.indexOf("isActive")] !== false,
        createdAt: row[headers.indexOf("createdAt")],
        lastLogin: row[headers.indexOf("lastLogin")]
      });
    }
    
    return { success: true, data: users };
  } catch (error) {
    Logger.log("Error getting users: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * C뿯½뿯½뿯½p nh뿯½뿯½뿯½t tr뿯½뿯½뿯½ng th뿯½뿯½i user (kh뿯½뿯½a/m뿯½뿯½Ÿ kh뿯½뿯½a)
 */
function updateUserStatus(userId, isActive) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Users" };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdIndex = headers.indexOf("userId");
    const isActiveIndex = headers.indexOf("isActive");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdIndex] === userId) {
        sheet.getRange(i + 1, isActiveIndex + 1).setValue(isActive);
        return { 
          success: true, 
          message: isActive ? "뿯½뿯½뿯½뿯½ m뿯½뿯½Ÿ kh뿯½뿯½a user" : "뿯½뿯½뿯½뿯½ kh뿯½뿯½a user" 
        };
      }
    }
    
    return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y user" };
  } catch (error) {
    Logger.log("Error updating user status: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ========================================
// TOPICS MANAGEMENT
// ========================================

/**
 * L뿯½뿯½뿯½y danh s뿯½뿯½ch Topics cho Admin (Content Management)
 * Tr뿯½뿯½뿯½ v뿯½뿯½뿯½ m뿯½뿯½뿯½ng topics tr뿯½뿯½뿯½c ti뿯½뿯½뿯½p 뿯½‘뿯½뿯½뿯ƽ s뿯½뿯½뿯½ d뿯½뿯½뿯½ng trong giao di뿯½뿯½‡n qu뿯½뿯½뿯½n l뿯½뿯½
 */
function getAllTopicsForAdmin() {
  try {
    const adminContext = (typeof requireAdminContext_ === 'function') ? requireAdminContext_() : getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return { success: false, message: "Không có quyền admin" };
    }

    const topicsResult = getAllTopicsIncludingHidden();
    if (!topicsResult.success) {
        return topicsResult;
    }
    
    return {
      success: true,
      data: topicsResult.topics
    };
  } catch (error) {
    Logger.log("Error in getAllTopicsForAdmin: " + error.toString());
    return { success: false, message: "Lỗi tải danh sách chủ đề: " + error.toString() };
  }
}


// ========================================
// LESSONS MANAGEMENT
// ========================================

/**
 * L뿯½뿯½뿯½y danh s뿯½뿯½ch Lessons (MCQ) cho Admin
 */
function getAllLessonsForAdmin() {
  try {
    const sheet = getSheet("MCQ_Questions");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet MCQ_Questions" };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    const headers = data[0];
    const lessons = [];
    
    // Get topic names for mapping
    const topicsSheet = getSheet("Topics");
    const topicMap = {};
    if (topicsSheet) {
      const topicsData = topicsSheet.getDataRange().getValues();
      const topicHeaders = topicsData[0];
      for (let i = 1; i < topicsData.length; i++) {
        topicMap[topicsData[i][topicHeaders.indexOf("topicId")]] = 
          topicsData[i][topicHeaders.indexOf("title")];
      }
    }
    
    for (let i = 1; i < Math.min(data.length, 101); i++) { // Limit to 100 items
      const row = data[i];
      const topicId = row[headers.indexOf("topicId")];
      lessons.push({
        lessonId: row[headers.indexOf("questionId")],
        name: (row[headers.indexOf("questionText")] || "").substring(0, 50) + "...",
        topicId: topicId,
        topicName: topicMap[topicId] || topicId,
        orderIndex: i
      });
    }
    
    return { success: true, data: lessons };
  } catch (error) {
    Logger.log("Error getting lessons: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ========================================
// CACHE MANAGEMENT
// ========================================

/**
 * Clear all admin cache
 */
function clearAllAdminCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(["topics_cache", "users_cache", "stats_cache"]);
    return { success: true, message: "뿯½뿯½뿯½뿯½ x뿯½뿯½a cache th뿯½뿯½nh c뿯½뿯½ng!" };
  } catch (error) {
    Logger.log("Error clearing cache: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * L뿯½뿯½뿯½y th뿯½뿯½ng tin admin hi뿯½뿯½‡n t뿯½뿯½뿯½i d뿯½뿯½뿯½a tr뿯½뿯½n email 뿯½‘뿯½뿯ƽng nh뿯½뿯½뿯½p
 */
function requireAdminContext_() {
  if (typeof getCurrentAdminContext !== 'function') {
    return { success: false, message: "H뿯½뿯½‡ th뿯½뿯½‘ng x뿯½뿯½c th뿯½뿯½뿯½c admin ch뿯½뿯½a s뿯½뿯½뿯½n s뿯½뿯½ng." };
  }
  const context = getCurrentAdminContext();
  if (!context || !context.success) {
    return {
      success: false,
      message: context && context.message ? context.message : "Kh뿯½뿯½ng c뿯½뿯½ quy뿯½뿯½뿯½n admin."
    };
  }
  return context;
}

function getCurrentAdminContext() {
  try {
    let email = "";
    try { email = Session.getActiveUser().getEmail(); } catch (e) {}
    if (!email) {
      try { email = Session.getEffectiveUser().getEmail(); } catch (e) {}
    }
    
    if (!email) {
      return { success: false, message: "Không thể lấy email phiên đăng nhập." };
    }

    const sheet = getSheet("Users");
    if (!sheet) return { success: false, message: "Không tìm thấy sheet Users" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const roleIndex = headers.indexOf("role");
    const userIdIndex = headers.indexOf("userId");
    const isActiveIndex = headers.indexOf("isActive");

    for (let i = 1; i < data.length; i++) {
      if (emailIndex !== -1 && String(data[i][emailIndex]).toLowerCase() === email.toLowerCase()) {
        const role = roleIndex !== -1 ? String(data[i][roleIndex]).toUpperCase() : "";
        if (role !== "ADMIN") {
          return { success: false, message: "Chỉ ADMIN mới có quyền truy cập." };
        }
        if (isActiveIndex !== -1 && data[i][isActiveIndex] === false) {
          return { success: false, message: "Tài khoản ADMIN đã bị khóa." };
        }
        return {
          success: true,
          email: email,
          userId: userIdIndex !== -1 ? data[i][userIdIndex] : "",
          role: role,
        };
      }
    }
    return { success: false, message: "Không tìm thấy tài khoản admin hợp lệ." };
  } catch (error) {
    return { success: false, message: "Lỗi kiểm tra quyền admin: " + error.toString() };
  }
}

// ========================================
// TOPIC EDITOR FUNCTIONS
// ========================================

// Folder IDs for Topic Editor
const TOPIC_EDITOR_CONFIG = {
  TOPIC_DOCS_FOLDER_ID: "1b2Z59iRVfi8c_JzRh2MKYKrx170JipD3",
  IMAGES_FOLDER_ID: "1nrcuio2Da7Zc3bij2HO4b7P8a-_053LN",
  DOC_IMAGE_MAX_WIDTH: 520,
  DOC_IMAGE_MAX_HEIGHT: 700
};

/**
 * L뿯½뿯½뿯½y HTML c뿯½뿯½뿯½a Topic Editor
 */
function getTopicEditorHtml() {
  try {
    const template = HtmlService.createTemplateFromFile('views/admin/topicEditor/topic_editor');
    return template.evaluate().getContent();
  } catch (error) {
    Logger.log("Error getting topic editor HTML: " + error.toString());
    return "<p>L뿯½뿯½—i t뿯½뿯½뿯½i Topic Editor: " + error.toString() + "</p>";
  }
}

/**
 * L뿯½뿯½뿯½y HTML 뿯½‘뿯½뿯½뿯½y 뿯½‘뿯½뿯½뿯½ c뿯½뿯½뿯½a Topic Editor (styles + content + scripts)
 */
function getTopicEditorFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/topicEditor/topic_editor_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/topicEditor/topic_editor').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/topicEditor/topic_editor_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting topic editor full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>L뿯½뿯½—i t뿯½뿯½뿯½i Topic Editor: " + error.toString() + "</p>";
  }
}

/**
 * L뿯½뿯½뿯½y HTML 뿯½‘뿯½뿯½뿯½y 뿯½‘뿯½뿯½뿯½ c뿯½뿯½뿯½a Content Management (styles + content + scripts)
 */
function getContentManagementFullHtml() {
  try {
    const symbols = HtmlService.createHtmlOutput('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />').getContent();
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/contentManagement/content_management_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/contentManagement/content_management_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/contentManagement/content_management_scripts').getContent();

    return symbols + styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting content management full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>L뿯½뿯½—i t뿯½뿯½뿯½i Qu뿯½뿯½뿯½n l뿯½뿯½ N뿯½뿯½™i dung: " + error.toString() + "</p>";
  }
}

/**
 * L뿯½뿯½뿯½y HTML 뿯½‘뿯½뿯½뿯½y 뿯½‘뿯½뿯½뿯½ c뿯½뿯½뿯½a User Stats (styles + content + scripts)
 */
function getUserStatsFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/userStats/user_stats_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/userStats/user_stats_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/userStats/user_stats_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting user stats full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>L뿯½뿯½—i t뿯½뿯½뿯½i Th뿯½뿯½‘ng k뿯½뿯½ ng뿯½뿯½뿯½뿯½뿯½i d뿯½뿯½ng: " + error.toString() + "</p>";
  }
}

/**
 * L뿯½뿯½뿯½y HTML 뿯½‘뿯½뿯½뿯½y 뿯½‘뿯½뿯½뿯½ c뿯½뿯½뿯½a Course Stats (styles + content + scripts)
 */
function getCourseStatsFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/courseStats/course_stats_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/courseStats/course_stats_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/courseStats/course_stats_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting course stats full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>L뿯½뿯½—i t뿯½뿯½뿯½i Th뿯½뿯½‘ng k뿯½뿯½ kh뿯½뿯½a h뿯½뿯½뿯½c: " + error.toString() + "</p>";
  }
}

// ========================================
// PET MANAGEMENT DATA (GOOGLE SHEETS)
// ========================================

const PET_ITEMS_SHEET_NAME = "Pet_Items";
const PET_ITEMS_HEADERS = [
  "itemId",
  "itemType",
  "name",
  "file",
  "priceXqp",
  "unlockType",
  "unlockValue",
  "petXpGain",
  "offsetX",
  "offsetY",
  "scalePercent",
  "positionMode",
  "positionProfilesJson",
  "orderIndex",
  "updatedAt",
];

const PET_VARIANTS_SHEET_NAME = "Pet_Variants";
const PET_VARIANTS_HEADERS = [
  "variantId",
  "name",
  "tone",
  "description",
  "level1File",
  "level2File",
  "eyeOpenFile",
  "eyeClosedFile",
  "unlockType",
  "unlockValue",
  "scalePercent",
  "tiltDeg",
  "orderIndex",
  "updatedAt",
  "secondPetPriceXqp",
];

const DEFAULT_PET_VARIANTS = [
  {
    id: "pet-12",
    name: "Pet 12",
    tone: "#f87171",
    description: "Mau PET so 12.",
    level1: "level1-blue.svg",
    level2: "PET/12.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-13",
    name: "Pet 13",
    tone: "#fb923c",
    description: "Mau PET so 13.",
    level1: "level1-green.svg",
    level2: "PET/13.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-14",
    name: "Pet 14",
    tone: "#facc15",
    description: "Mau PET so 14.",
    level1: "level1-pink.svg",
    level2: "PET/14.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-15",
    name: "Pet 15",
    tone: "#a3e635",
    description: "Mau PET so 15.",
    level1: "level1-yellow.svg",
    level2: "PET/15.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-16",
    name: "Pet 16",
    tone: "#34d399",
    description: "Mau PET so 16.",
    level1: "level1-blue.svg",
    level2: "PET/16.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-17",
    name: "Pet 17",
    tone: "#22d3ee",
    description: "Mau PET so 17.",
    level1: "level1-green.svg",
    level2: "PET/17.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-18",
    name: "Pet 18",
    tone: "#38bdf8",
    description: "Mau PET so 18.",
    level1: "level1-pink.svg",
    level2: "PET/18.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-19",
    name: "Pet 19",
    tone: "#60a5fa",
    description: "Mau PET so 19.",
    level1: "level1-yellow.svg",
    level2: "PET/19.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-20",
    name: "Pet 20",
    tone: "#818cf8",
    description: "Mau PET so 20.",
    level1: "level1-blue.svg",
    level2: "PET/20.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-21",
    name: "Pet 21",
    tone: "#a78bfa",
    description: "Mau PET so 21.",
    level1: "level1-green.svg",
    level2: "PET/21.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-22",
    name: "Pet 22",
    tone: "#f472b6",
    description: "Mau PET so 22.",
    level1: "level1-pink.svg",
    level2: "PET/22.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
  {
    id: "pet-23",
    name: "Pet 23",
    tone: "#fb7185",
    description: "Mau PET so 23.",
    level1: "level1-yellow.svg",
    level2: "PET/23.svg",
    eyeOpen: "",
    eyeClosed: "",
    unlockCondition: { type: "level", value: 1 },
    scalePercent: 100,
    tiltDeg: 0,
  },
];

const DEFAULT_LEVEL1_FILE = "level1-yellow.svg";

const LEGACY_PET_VARIANT_IDS = ["pink", "yellow", "blue", "green"];

function normalizePetUnlockConditionEntry_(entry) {
  const safeEntry = entry || {};
  const type = String(safeEntry.type || "level").trim() || "level";
  let value = safeEntry.value;

  if (type === "level") {
    value = parseInt(value, 10);
    if (isNaN(value) || value < 1) value = 1;
    return { type: "level", value: value };
  }

  value = String(value || "").trim();
  if (!value) return null;

  return { type: type, value: value };
}

function normalizePetUnlockMode_(mode) {
  return String(mode || "all") === "any" ? "any" : "all";
}

function normalizePetUnlockCondition_(unlockCondition) {
  const raw = unlockCondition || {};

  if (raw && Array.isArray(raw.conditions)) {
    const mode = normalizePetUnlockMode_(raw.mode);
    const normalizedConditions = raw.conditions
      .map(normalizePetUnlockConditionEntry_)
      .filter(Boolean);

    if (normalizedConditions.length === 0) {
      return { type: "level", value: 1 };
    }
    if (normalizedConditions.length === 1) {
      return normalizedConditions[0];
    }

    return {
      mode: mode,
      conditions: normalizedConditions,
    };
  }

  return normalizePetUnlockConditionEntry_(raw) || { type: "level", value: 1 };
}

function serializePetUnlockConditionForSheet_(unlockCondition) {
  const normalized = normalizePetUnlockCondition_(unlockCondition);

  if (Array.isArray(normalized.conditions)) {
    return {
      unlockType: "multi",
      unlockValue: JSON.stringify({
        mode: normalizePetUnlockMode_(normalized.mode),
        conditions: normalized.conditions,
      }),
    };
  }

  return {
    unlockType: String(normalized.type || "level"),
    unlockValue: normalized.value,
  };
}

function parsePetUnlockConditionFromSheet_(unlockTypeCell, unlockValueCell) {
  const unlockType = String(unlockTypeCell || "level").trim() || "level";

  if (unlockType === "multi") {
    let parsed = null;

    if (unlockValueCell && typeof unlockValueCell === "string") {
      try {
        parsed = JSON.parse(unlockValueCell);
      } catch (e) {
        parsed = null;
      }
    } else if (unlockValueCell && typeof unlockValueCell === "object") {
      parsed = unlockValueCell;
    }

    return normalizePetUnlockCondition_(parsed || { type: "level", value: 1 });
  }

  return normalizePetUnlockCondition_({
    type: unlockType,
    value: unlockValueCell,
  });
}

function enforcePetVariantLevel1Egg_(variant) {
  const safeVariant = variant || {};
  return Object.assign({}, safeVariant, {
    level1: String(safeVariant.level1 || DEFAULT_LEVEL1_FILE),
    level2: String(safeVariant.level2 || ""),
    eyeOpen: String(safeVariant.eyeOpen || ""),
    eyeClosed: String(safeVariant.eyeClosed || ""),
    unlockCondition: normalizePetUnlockCondition_(safeVariant.unlockCondition),
    tiltDeg: Math.max(-45, Math.min(45, parseInt(safeVariant.tiltDeg, 10) || 0)),
    secondPetPriceXqp: Math.max(0, parseInt(safeVariant.secondPetPriceXqp, 10) || 500),
  });
}

function isLegacyPetVariantSet_(variants) {
  if (!Array.isArray(variants) || variants.length !== LEGACY_PET_VARIANT_IDS.length) {
    return false;
  }

  const variantIds = variants
    .map(function (variant) {
      return String((variant && variant.id) || "").toLowerCase().trim();
    })
    .sort();
  const legacyIds = LEGACY_PET_VARIANT_IDS.slice().sort();

  for (let i = 0; i < legacyIds.length; i++) {
    if (variantIds[i] !== legacyIds[i]) {
      return false;
    }
  }

  return variants.every(function (variant) {
    const level1 = String((variant && variant.level1) || "").trim();
    const level2 = String((variant && variant.level2) || "").trim();
    const eyeOpen = String((variant && variant.eyeOpen) || "").trim();
    const eyeClosed = String((variant && variant.eyeClosed) || "").trim();

    return (
      (/^level1-(pink|yellow|blue|green)\.svg$/i.test(level1) ||
        level1.toLowerCase() === DEFAULT_LEVEL1_FILE.toLowerCase()) &&
      /^level2-(pink|yellow|blue|green)\.svg$/i.test(level2) &&
      /^eye-(pink|yellow|blue|green)-open\.svg$/i.test(eyeOpen) &&
      /^eye-(pink|yellow|blue|green)-close\.svg$/i.test(eyeClosed)
    );
  });
}

function overwritePetVariantsWithDefault_(sheet) {
  const rows = DEFAULT_PET_VARIANTS.map(function (variant, index) {
    return toPetVariantRow_(variant, index);
  });

  sheet.clearContents();
  sheet
    .getRange(1, 1, 1, PET_VARIANTS_HEADERS.length)
    .setValues([PET_VARIANTS_HEADERS]);
  sheet.getRange(1, 1, 1, PET_VARIANTS_HEADERS.length).setFontWeight("bold");
  sheet.setFrozenRows(1);

  if (rows.length > 0) {
    sheet
      .getRange(2, 1, rows.length, PET_VARIANTS_HEADERS.length)
      .setValues(rows);
  }
}

function ensurePetItemsSheet_() {
  const ss = getOrCreateDatabase();
  let sheet = ss.getSheetByName(PET_ITEMS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PET_ITEMS_SHEET_NAME);
  }

  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, PET_ITEMS_HEADERS.length).setValues([PET_ITEMS_HEADERS]);
    sheet.getRange(1, 1, 1, PET_ITEMS_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return sheet;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  if (headers.length < PET_ITEMS_HEADERS.length) {
    sheet
      .getRange(1, 1, 1, PET_ITEMS_HEADERS.length)
      .setValues([PET_ITEMS_HEADERS]);
  }

  return sheet;
}

function ensurePetVariantsSheet_() {
  const ss = getOrCreateDatabase();
  let sheet = ss.getSheetByName(PET_VARIANTS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PET_VARIANTS_SHEET_NAME);
  }

  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, PET_VARIANTS_HEADERS.length).setValues([PET_VARIANTS_HEADERS]);
    sheet.getRange(1, 1, 1, PET_VARIANTS_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return sheet;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const hasSameHeaders =
    headers.length >= PET_VARIANTS_HEADERS.length &&
    PET_VARIANTS_HEADERS.every(function (header, index) {
      return String(headers[index] || "").trim() === header;
    });

  if (headers.length < PET_VARIANTS_HEADERS.length || !hasSameHeaders) {
    sheet.getRange(1, 1, 1, PET_VARIANTS_HEADERS.length).setValues([PET_VARIANTS_HEADERS]);
    sheet.getRange(1, 1, 1, PET_VARIANTS_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function normalizePetItemType_(itemType) {
  const safeType = String(itemType || "").toLowerCase().trim();
  if (safeType === "food") return "food";
  if (safeType === "backgrounds" || safeType === "background" || safeType === "bg") {
    return "backgrounds";
  }
  return "accessories";
}

function toPetItemRow_(item, itemType, orderIndex) {
  const safeItem = item || {};
  const unlock = serializePetUnlockConditionForSheet_(safeItem.unlockCondition);

  const normalizedType = normalizePetItemType_(itemType);
  const isFood = normalizedType === "food";
  const isAccessory = normalizedType === "accessories";
  let scalePercent = parseInt(safeItem.scalePercent, 10);
  if (isNaN(scalePercent)) scalePercent = 100;
  scalePercent = Math.max(40, Math.min(220, scalePercent));
  const positionMode = isAccessory ? String(safeItem.positionMode || "center") : "center";
  const positionProfilesJson =
    isAccessory ? JSON.stringify(safeItem.positionProfiles || {}) : "";

  return [
    String(safeItem.id || ""),
    normalizedType,
    String(safeItem.name || ""),
    String(safeItem.file || ""),
    parseInt(safeItem.priceXqp, 10) || 0,
    unlock.unlockType,
    unlock.unlockValue,
    isFood ? parseInt(safeItem.petXpGain, 10) || 0 : 0,
    isAccessory ? parseInt(safeItem.offsetX, 10) || 0 : 0,
    isAccessory ? parseInt(safeItem.offsetY, 10) || 0 : 0,
    isAccessory ? scalePercent : 100,
    positionMode,
    positionProfilesJson,
    parseInt(orderIndex, 10) || 0,
    new Date(),
  ];
}

function toPetVariantRow_(variant, orderIndex) {
  const safeVariant = enforcePetVariantLevel1Egg_(variant || {});
  const unlock = serializePetUnlockConditionForSheet_(safeVariant.unlockCondition);

  let scalePercent = parseInt(safeVariant.scalePercent, 10);
  if (isNaN(scalePercent)) scalePercent = 100;
  scalePercent = Math.max(40, Math.min(220, scalePercent));
  let tiltDeg = parseInt(safeVariant.tiltDeg, 10);
  if (isNaN(tiltDeg)) tiltDeg = 0;
  tiltDeg = Math.max(-45, Math.min(45, tiltDeg));
  const secondPetPriceXqp = Math.max(0, parseInt(safeVariant.secondPetPriceXqp, 10) || 500);

  return [
    String(safeVariant.id || ""),
    String(safeVariant.name || ""),
    String(safeVariant.tone || "#7c8cff"),
    String(safeVariant.description || ""),
    String(safeVariant.level1 || ""),
    String(safeVariant.level2 || ""),
    String(safeVariant.eyeOpen || ""),
    String(safeVariant.eyeClosed || ""),
    unlock.unlockType,
    unlock.unlockValue,
    scalePercent,
    tiltDeg,
    parseInt(orderIndex, 10) || 0,
    new Date(),
    secondPetPriceXqp,
  ];
}

function parsePetVariantRows_(data) {
  if (!Array.isArray(data) || data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const idx = function (name) {
    return headers.indexOf(name);
  };

  const variantIdIdx = idx("variantId");
  const nameIdx = idx("name");
  const toneIdx = idx("tone");
  const descriptionIdx = idx("description");
  const level1Idx = idx("level1File");
  const level2Idx = idx("level2File");
  const eyeOpenIdx = idx("eyeOpenFile");
  const eyeClosedIdx = idx("eyeClosedFile");
  const unlockTypeIdx = idx("unlockType");
  const unlockValueIdx = idx("unlockValue");
  const scalePercentIdx = idx("scalePercent");
  const tiltDegIdx = idx("tiltDeg");
  const orderIdx = idx("orderIndex");
  const secondPetPriceIdx = idx("secondPetPriceXqp");

  if (
    variantIdIdx < 0 ||
    nameIdx < 0 ||
    level1Idx < 0 ||
    level2Idx < 0 ||
    unlockTypeIdx < 0 ||
    unlockValueIdx < 0 ||
    scalePercentIdx < 0 ||
    orderIdx < 0
  ) {
    return [];
  }

  const variants = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const variantId = row[variantIdIdx];
    if (!variantId) continue;

    const unlockCondition = parsePetUnlockConditionFromSheet_(
      row[unlockTypeIdx],
      row[unlockValueIdx],
    );

    let scalePercent = parseInt(row[scalePercentIdx], 10);
    if (isNaN(scalePercent)) scalePercent = 100;
    scalePercent = Math.max(40, Math.min(220, scalePercent));

    let tiltDeg = parseInt(row[tiltDegIdx], 10);
    let orderIndex = parseInt(row[orderIdx], 10);
    if (isNaN(orderIndex) && !isNaN(tiltDeg)) {
      // Legacy rows stored orderIndex where tiltDeg now resides.
      orderIndex = tiltDeg;
      tiltDeg = 0;
    }
    if (isNaN(tiltDeg)) tiltDeg = 0;
    tiltDeg = Math.max(-45, Math.min(45, tiltDeg));
    let secondPetPriceXqp =
      secondPetPriceIdx >= 0 ? parseInt(row[secondPetPriceIdx], 10) : NaN;
    if (isNaN(secondPetPriceXqp)) secondPetPriceXqp = 500;
    secondPetPriceXqp = Math.max(0, secondPetPriceXqp);

    variants.push({
      id: String(variantId),
      name: String(row[nameIdx] || ""),
      tone: String(row[toneIdx] || "#7c8cff"),
      description: String(row[descriptionIdx] || ""),
      level1: String(row[level1Idx] || DEFAULT_LEVEL1_FILE),
      level2: String(row[level2Idx] || ""),
      eyeOpen: String(row[eyeOpenIdx] || ""),
      eyeClosed: String(row[eyeClosedIdx] || ""),
      unlockCondition: unlockCondition,
      scalePercent: scalePercent,
      tiltDeg: tiltDeg,
      secondPetPriceXqp: secondPetPriceXqp,
      _orderIndex: isNaN(orderIndex) ? 0 : orderIndex,
    });
  }

  variants.sort(function (a, b) {
    return (a._orderIndex || 0) - (b._orderIndex || 0);
  });

  variants.forEach(function (item) {
    delete item._orderIndex;
  });

  return variants;
}

function seedDefaultPetVariantsIfEmpty_() {
  const sheet = ensurePetVariantsSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    overwritePetVariantsWithDefault_(sheet);
    return;
  }

  const variants = parsePetVariantRows_(data);
  if (isLegacyPetVariantSet_(variants)) {
    overwritePetVariantsWithDefault_(sheet);
  }
}

function getPetItemsForAdmin() {
  try {
    seedDefaultPetVariantsIfEmpty_();
    const sheet = ensurePetItemsSheet_();
    const data = sheet.getDataRange().getValues();
    const variantsResult = getPetVariantsForAdmin();
    const variants = variantsResult.success ? variantsResult.variants : [];

    if (data.length <= 1) {
      return {
        success: true,
        accessories: [],
        food: [],
        backgrounds: [],
        variants: variants,
      };
    }

    const headers = data[0];
    const idx = function (name) {
      return headers.indexOf(name);
    };

    const itemIdIdx = idx("itemId");
    const itemTypeIdx = idx("itemType");
    const nameIdx = idx("name");
    const fileIdx = idx("file");
    const priceIdx = idx("priceXqp");
    const unlockTypeIdx = idx("unlockType");
    const unlockValueIdx = idx("unlockValue");
    const petXpIdx = idx("petXpGain");
    const offsetXIdx = idx("offsetX");
    const offsetYIdx = idx("offsetY");
    const scalePercentIdx = idx("scalePercent");
    const positionModeIdx = idx("positionMode");
    const positionProfilesIdx = idx("positionProfilesJson");
    const orderIdx = idx("orderIndex");

    const accessories = [];
    const food = [];
    const backgrounds = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const itemId = row[itemIdIdx];
      if (!itemId) continue;

      const itemType = normalizePetItemType_(row[itemTypeIdx]);
      const unlockCondition = parsePetUnlockConditionFromSheet_(
        row[unlockTypeIdx],
        row[unlockValueIdx],
      );

      let orderIndex = parseInt(row[orderIdx], 10);
      if (isNaN(orderIndex) && positionProfilesIdx >= 0) {
        // Legacy rows (before positionProfilesJson) stored orderIndex in this slot.
        const legacyOrderIndex = parseInt(row[positionProfilesIdx], 10);
        if (!isNaN(legacyOrderIndex)) {
          orderIndex = legacyOrderIndex;
        }
      }

      const item = {
        id: String(itemId),
        name: String(row[nameIdx] || ""),
        file: String(row[fileIdx] || ""),
        priceXqp: parseInt(row[priceIdx], 10) || 0,
        unlockCondition: unlockCondition,
        _orderIndex: isNaN(orderIndex) ? 0 : orderIndex,
      };

      if (itemType === "food") {
        item.petXpGain = parseInt(row[petXpIdx], 10) || 0;
        food.push(item);
      } else if (itemType === "backgrounds") {
        backgrounds.push(item);
      } else {
        let parsedProfiles = {};
        if (positionProfilesIdx >= 0) {
          const rawProfiles = row[positionProfilesIdx];
          if (rawProfiles && typeof rawProfiles === "string") {
            try {
              const parsed = JSON.parse(rawProfiles);
              parsedProfiles = parsed && typeof parsed === "object" ? parsed : {};
            } catch (e) {
              parsedProfiles = {};
            }
          } else if (rawProfiles && typeof rawProfiles === "object") {
            parsedProfiles = rawProfiles;
          }
        }

        item.offsetX = parseInt(row[offsetXIdx], 10) || 0;
        item.offsetY = parseInt(row[offsetYIdx], 10) || 0;
        let scalePercent = parseInt(row[scalePercentIdx], 10);
        if (isNaN(scalePercent)) scalePercent = 100;
        item.scalePercent = Math.max(40, Math.min(220, scalePercent));
        item.positionMode = String(row[positionModeIdx] || "center");
        item.positionProfiles = parsedProfiles;
        accessories.push(item);
      }
    }

    const sortByOrder = function (a, b) {
      return (a._orderIndex || 0) - (b._orderIndex || 0);
    };

    accessories.sort(sortByOrder);
    food.sort(sortByOrder);
    backgrounds.sort(sortByOrder);

    accessories.forEach(function (item) {
      delete item._orderIndex;
    });
    food.forEach(function (item) {
      delete item._orderIndex;
    });
    backgrounds.forEach(function (item) {
      delete item._orderIndex;
    });

    return {
      success: true,
      accessories: accessories,
      food: food,
      backgrounds: backgrounds,
      variants: variants,
    };
  } catch (error) {
    Logger.log("Error getting pet items for admin: " + error.toString());
    return {
      success: false,
      message: error.toString(),
      accessories: [],
      food: [],
      backgrounds: [],
      variants: [],
    };
  }
}

function getPetVariantsForAdmin() {
  try {
    seedDefaultPetVariantsIfEmpty_();
    const sheet = ensurePetVariantsSheet_();
    const data = sheet.getDataRange().getValues();
    let variants = parsePetVariantRows_(data).map(enforcePetVariantLevel1Egg_);

    if (variants.length < 12) {
      overwritePetVariantsWithDefault_(sheet);

      variants = DEFAULT_PET_VARIANTS.map(function (variant) {
        return {
          id: variant.id,
          name: variant.name,
          tone: variant.tone,
          description: variant.description,
          level1: variant.level1,
          level2: variant.level2,
          eyeOpen: variant.eyeOpen,
          eyeClosed: variant.eyeClosed,
          unlockCondition: {
            type: variant.unlockCondition.type,
            value: variant.unlockCondition.value,
          },
          scalePercent: variant.scalePercent,
          tiltDeg: variant.tiltDeg || 0,
          secondPetPriceXqp: variant.secondPetPriceXqp,
        };
      });
    }

    return {
      success: true,
      variants: variants,
    };
  } catch (error) {
    Logger.log("Error getting pet variants for admin: " + error.toString());
    return {
      success: false,
      message: error.toString(),
      variants: [],
    };
  }
}

function getPetVariantsForUser() {
  try {
    const result = getPetVariantsForAdmin();
    if (!result || result.success !== true) {
      return {
        success: false,
        variants: [],
        message: result && result.message ? result.message : "Failed to load pet variants",
      };
    }

    return {
      success: true,
      variants: result.variants || [],
    };
  } catch (error) {
    Logger.log("Error getting pet variants for user: " + error.toString());
    return {
      success: false,
      message: error.toString(),
      variants: [],
    };
  }
}

function savePetVariantsForAdmin(payloadJson) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload =
      typeof payloadJson === "string"
        ? JSON.parse(payloadJson || "{}")
        : payloadJson || {};

    const variants = Array.isArray(payload.variants) ? payload.variants : [];
    const normalizedVariants = variants.map(enforcePetVariantLevel1Egg_);

    const rows = normalizedVariants.map(function (variant, index) {
      return toPetVariantRow_(variant, index);
    });

    const sheet = ensurePetVariantsSheet_();
    sheet.clearContents();
    sheet
      .getRange(1, 1, 1, PET_VARIANTS_HEADERS.length)
      .setValues([PET_VARIANTS_HEADERS]);
    sheet.getRange(1, 1, 1, PET_VARIANTS_HEADERS.length).setFontWeight("bold");

    if (rows.length > 0) {
      sheet
        .getRange(2, 1, rows.length, PET_VARIANTS_HEADERS.length)
        .setValues(rows);
    }

    return {
      success: true,
      message: "뿯½뿯½뿯½뿯½ l뿯½뿯½u danh s뿯½뿯½ch Pet variants th뿯½뿯½nh c뿯½뿯½ng",
      totalVariants: rows.length,
    };
  } catch (error) {
    Logger.log("Error saving pet variants for admin: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * One-shot: Ghi de ngay lap tuc sheet Pet_Variants bang bo default hien tai.
 * Chay tay trong Apps Script Editor khi can dong bo ngay, khong doi lan tai trang dau tien.
 */
function syncPetVariantsOneShotNow() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ensurePetVariantsSheet_();
    const beforeData = sheet.getDataRange().getValues();
    const beforeVariants = parsePetVariantRows_(beforeData);

    overwritePetVariantsWithDefault_(sheet);

    const afterData = sheet.getDataRange().getValues();
    const afterVariants = parsePetVariantRows_(afterData);

    return {
      success: true,
      message: "Da dong bo ngay Pet_Variants theo bo default moi",
      sheetName: PET_VARIANTS_SHEET_NAME,
      previousCount: beforeVariants.length,
      updatedCount: afterVariants.length,
      updatedVariantIds: afterVariants.map(function (variant) {
        return variant.id;
      }),
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    Logger.log("Error running one-shot Pet_Variants sync: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  } finally {
    lock.releaseLock();
  }
}

function savePetItemsForAdmin(payloadJson) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload =
      typeof payloadJson === "string"
        ? JSON.parse(payloadJson || "{}")
        : payloadJson || {};

    const accessories = Array.isArray(payload.accessories)
      ? payload.accessories
      : [];
    const food = Array.isArray(payload.food) ? payload.food : [];
    const backgrounds = Array.isArray(payload.backgrounds)
      ? payload.backgrounds
      : [];

    const rows = [];
    accessories.forEach(function (item, index) {
      rows.push(toPetItemRow_(item, "accessories", index));
    });

    food.forEach(function (item, index) {
      rows.push(toPetItemRow_(item, "food", index));
    });

    backgrounds.forEach(function (item, index) {
      rows.push(toPetItemRow_(item, "backgrounds", index));
    });

    const sheet = ensurePetItemsSheet_();
    sheet.clearContents();

    sheet
      .getRange(1, 1, 1, PET_ITEMS_HEADERS.length)
      .setValues([PET_ITEMS_HEADERS]);

    if (rows.length > 0) {
      sheet
        .getRange(2, 1, rows.length, PET_ITEMS_HEADERS.length)
        .setValues(rows);
    }

    return {
      success: true,
      message: "뿯½뿯½뿯½뿯½ l뿯½뿯½u danh m뿯½뿯½뿯½c PET th뿯½뿯½nh c뿯½뿯½ng",
      totalItems: rows.length,
    };
  } catch (error) {
    Logger.log("Error saving pet items for admin: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ki뿯½뿯½뿯ƽm tra quy뿯½뿯½뿯½n admin c뿯½뿯½뿯½a user hi뿯½뿯½‡n t뿯½뿯½뿯½i
 * @returns {boolean} - true n뿯½뿯½뿯½u l뿯½뿯½ admin, ng뿯½뿯½뿯½뿯½뿯½c l뿯½뿯½뿯½i false
 */
function checkAdminRole() {
  try {
    const context = getCurrentAdminContext();
    return context && context.success === true;
  } catch (e) {
    Logger.log("Error in checkAdminRole: " + e.toString());
    return false;
  }
}

/**
 * L뿯½뿯½뿯½y to뿯½뿯½n b뿯½뿯½™ HTML (Styles + Content + Scripts) cho trang Qu뿯½뿯½뿯½n l뿯½뿯½ Email
 */
function getAdminEmailManagementFullHtml() {
  try {
    const isAdmin = checkAdminRole();
    if (!isAdmin) {
      return '<div style="padding:40px;text-align:center;color:#d93025;">B뿯½뿯½뿯½n kh뿯½뿯½ng c뿯½뿯½ quy뿯½뿯½뿯½n truy c뿯½뿯½뿯½p trang n뿯½뿯½y.</div>';
    }

    const styles = HtmlService.createHtmlOutputFromFile('views/admin/emailManagement/email_management_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/emailManagement/email_management_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/emailManagement/email_management_scripts').getContent();

    return styles + '\n' + content + '\n' + scripts;
  } catch (error) {
    Logger.log('L뿯½뿯½—i trong getAdminEmailManagementFullHtml: ' + error.toString());
    return '<div style="padding:40px;text-align:center;color:#d93025;">L뿯½뿯½—i render Qu뿯½뿯½뿯½n l뿯½뿯½ Email: ' + error.toString() + '</div>';
  }
}

/**
 * L뿯½뿯½뿯½y HTML 뿯½‘뿯½뿯½뿯½y 뿯½‘뿯½뿯½뿯½ c뿯½뿯½뿯½a Pet Management (styles + content + scripts)
 */
function getPetManagementFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/petManagement/pet_management_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/petManagement/pet_management_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/petManagement/pet_management_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting pet management full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>L뿯½뿯½—i t뿯½뿯½뿯½i Qu뿯½뿯½뿯½n l뿯½뿯½ PET: " + error.toString() + "</p>";
  }
}

/**
 * Include file HTML (styles, scripts)
 */
function includeTopicEditorFile(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Upload h뿯½뿯½nh 뿯½뿯½뿯½nh l뿯½뿯½n Google Drive
 * @param {string} base64Data - D뿯½뿯½뿯½ li뿯½뿯½‡u h뿯½뿯½nh 뿯½뿯½뿯½nh d뿯½뿯½뿯½ng base64
 * @param {string} fileName - T뿯½뿯½n file
 * @param {string} mimeType - Lo뿯½뿯½뿯½i file (image/png, image/jpeg, etc.)
 * @returns {object} - {success, imageUrl, message}
 */
function uploadImageToDrive(base64Data, fileName, mimeType) {
  try {
    Logger.log("=== UPLOAD IMAGE TO DRIVE ===");
    Logger.log("File name: " + fileName);
    Logger.log("Mime type: " + mimeType);
    
    // Get the images folder
    let folder;
    try {
      folder = DriveApp.getFolderById(TOPIC_EDITOR_CONFIG.IMAGES_FOLDER_ID);
    } catch (e) {
      Logger.log("Image upload folder not found or accessible. Falling back to root folder: " + e.toString());
      folder = DriveApp.getRootFolder();
    }
    
    // Decode base64 to blob
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      fileName
    );
    
    // Create unique filename
    const uniqueFileName = Utilities.getUuid() + "_" + fileName;
    blob.setName(uniqueFileName);
    
    // Upload to Drive
    const file = folder.createFile(blob);
    
    // Set permissions - anyone with link can view
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingError) {
      Logger.log("Warning: Could not set sharing permissions on file: " + sharingError.toString());
    }
    
    // Get direct image URL - s뿯½뿯½뿯½ d뿯½뿯½뿯½ng format lh3.googleusercontent.com 뿯½‘뿯½뿯½뿯ƽ embed t뿯½뿯½‘t h뿯½뿯½n
    const fileId = file.getId();
    // Format n뿯½뿯½y ho뿯½뿯½뿯½t 뿯½‘뿯½뿯½™ng t뿯½뿯½‘t h뿯½뿯½n cho embedding trong HTML
    const imageUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    Logger.log("뿯½œ… Image uploaded successfully");
    Logger.log("File ID: " + fileId);
    Logger.log("Image URL: " + imageUrl);

    return {
      success: true,
      imageUrl: imageUrl,
      fileId: fileId,
      message: "Upload th뿯½뿯½nh c뿯½뿯½ng!"
    };
  } catch (error) {
    Logger.log("뿯½뿯½Œ Error uploading image: " + error.toString());
    return {
      success: false,
      imageUrl: "",
      message: "L뿯½뿯½—i upload: " + error.toString()
    };
  }
}

/**
 * T뿯½뿯½뿯½o Google Doc v뿯½뿯½ publish topic v뿯½뿯½o MasterDB
 * @param {object} topicData - D뿯½뿯½뿯½ li뿯½뿯½‡u topic
 * @returns {object} - {success, docId, docUrl, message}
 */
function createAndPublishTopic(topicData) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext.success) return { success: false, message: adminContext.message };

    if (!topicData.topicId || !topicData.title || !topicData.courseId || !topicData.content) {
      return { success: false, message: "Thiếu thông tin bắt buộc (topicId, title, courseId, content)" };
    }

    const existingTopic = checkTopicIdExists(topicData.topicId);
    if (existingTopic) {
      return { success: false, message: "Topic ID đã tồn tại." };
    }
    
    if (typeof courseExists_ === "function" && !courseExists_(topicData.courseId)) {
      return { success: false, message: "Course ID không tồn tại." };
    }

    const docResult = createTopicDocument(topicData.title, topicData.content);
    if (!docResult.success) return docResult;

    const saveResult = saveTopicToMasterDB({
      topicId: topicData.topicId,
      title: topicData.title,
      description: topicData.description || "",
      courseId: topicData.courseId,
      category: topicData.category || "General",
      order: topicData.order || 999,
      prerequisiteTopics: topicData.prerequisiteTopics || "",
      unlockCondition: topicData.unlockCondition || "",
      isLocked: topicData.isLocked || false,
      contentDocId: docResult.docId,
      contentDocUrl: docResult.docUrl,
      createdBy: adminContext.userId || adminContext.email || "ADMIN",
      xpReward: topicData.xpReward,
      quizXpReward: topicData.quizXpReward,
      matchingXpReward: topicData.matchingXpReward
    });
    
    if (!saveResult.success) {
      try { DriveApp.getFileById(docResult.docId).setTrashed(true); } catch (e) {}
      return saveResult;
    }
    
    try { clearTopicsCache(); } catch (e) {}
    
    return {
      success: true,
      docId: docResult.docId,
      docUrl: docResult.docUrl,
      topicId: topicData.topicId,
      message: "Topic đã được publish thành công!"
    };
  } catch (error) {
    return { success: false, message: "Lỗi tạo topic: " + error.toString() };
  }
}

/**
 * T뿯½뿯½뿯½o Google Doc t뿯½뿯½뿯½ n뿯½뿯½™i dung HTML
 * @param {string} title - Ti뿯½뿯½u 뿯½‘뿯½뿯½뿯½ doc
 * @param {string} htmlContent - N뿯½뿯½™i dung HTML
 * @returns {object} - {success, docId, docUrl, message}
  */
function createTopicDocument(title, htmlContent) {
  try {
    Logger.log("=== CREATE TOPIC DOCUMENT ===");
    Logger.log("Title: " + title);

    // Get the topics folder (validate access)
    let folder;
    try {
      folder = DriveApp.getFolderById(TOPIC_EDITOR_CONFIG.TOPIC_DOCS_FOLDER_ID);
    } catch (folderErr) {
      Logger.log("뿯½뿯½Œ Cannot access topics folder: " + folderErr.toString());
      return {
        success: false,
        docId: "",
        docUrl: "",
        message:
          "Kh뿯½뿯½ng truy c뿯½뿯½뿯½p 뿯½‘뿯½뿯½뿯½뿯½뿯½c folder l뿯½뿯½u Docs. Ki뿯½뿯½뿯ƽm tra quy뿯½뿯½뿯½n truy c뿯½뿯½뿯½p folder: " +
          TOPIC_EDITOR_CONFIG.TOPIC_DOCS_FOLDER_ID,
      };
    }
    
    // Create new Google Doc
    const doc = DocumentApp.create(title);
    const docId = doc.getId();
    
    // Get the body and add content
    const body = doc.getBody();
    
    // Convert HTML to Doc content
    // Note: Google Docs doesn't support direct HTML insert,
    // so we need to parse and format
    const cleanContent = convertHtmlToDocContent(htmlContent, body);
    
    // Save and close
    doc.saveAndClose();
    
    // Move doc to the correct folder
    const file = DriveApp.getFileById(docId);
    folder.addFile(file);
    try {
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) {
      Logger.log("뿯½š뿯½뿯½뿯½뿯½ Could not remove file from root: " + e.toString());
    }
    
    // Set sharing - anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const docUrl = doc.getUrl();
    
    Logger.log("뿯½œ… Doc created successfully");
    Logger.log("Doc ID: " + docId);
    Logger.log("Doc URL: " + docUrl);
    
    return {
      success: true,
      docId: docId,
      docUrl: docUrl,
      message: "T뿯½뿯½뿯½o document th뿯½뿯½nh c뿯½뿯½ng!"
    };
  } catch (error) {
    Logger.log("뿯½뿯½Œ Error creating document: " + error.toString());
    return {
      success: false,
      docId: "",
      docUrl: "",
      message: "L뿯½뿯½—i t뿯½뿯½뿯½o document: " + error.toString()
    };
  }
}

/**
 * Chuy뿯½뿯½뿯ƽn 뿯½‘뿯½뿯½•i HTML content sang Google Doc format.
 * Handles both HTML elements AND text-based block markers ([[NOTE]], [[CODE:PYTHON]], etc.).
 *
 * Strategy:
 *   1. Normalize HTML entities and bracket markers.
 *   2. Extract block markers ([[TYPE]]...[[/TYPE]]) FIRST and split the HTML into
 *      an ordered list of segments: { kind:"html", value } and { kind:"marker", value }.
 *   3. For each HTML segment, use parseHtmlBlocks() to write structured content.
 *   4. For each marker segment, write it as a plain-text paragraph so it round-trips.
 *
 * @param {string} html - N뿯½뿯½™i dung HTML (with block markers as text)
 * @param {Body} body - Body c뿯½뿯½뿯½a Google Doc
 */
function convertHtmlToDocContent(html, body) {
  try {
    // Remove existing content
    body.clear();

    Logger.log("=== CONVERT HTML TO DOC ===");
    Logger.log("Input HTML length: " + (html ? html.length : 0));
    Logger.log("Input HTML preview: " + (html ? html.substring(0, 500) : "empty"));

    // If no content, add placeholder
    if (!html || html.trim() === '' || html.trim() === '<br>' || html.trim() === '<p><br></p>') {
      body.appendParagraph("(N뿯½뿯½™i dung tr뿯½뿯½‘ng)");
      ensureDocEndsWithHetMarker(body);
      return true;
    }

    // Process the HTML content
    var content = html;

    // Replace common HTML entities
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');

    // Ensure CODE markers are normalized and never left unclosed before parsing blocks
    content = normalizeCodeMarkersInHtml(content);

    // ====================================================================
    // Split content into sequential segments: HTML chunks and marker lines.
    // Markers look like [[NOTE]], [[/NOTE]], [[CODE:PYTHON]], [[TERMINAL]],
    // [[/CODE]], [[COLOR:RED]], [[/COLOR]], [[GRID]], [[/GRID]], etc.
    // ====================================================================
    var segments = splitContentIntoSegments(content);

    Logger.log("Segments count: " + segments.length);

    if (segments.length === 0) {
      body.appendParagraph("(Kh뿯½뿯½ng th뿯½뿯½뿯ƽ parse n뿯½뿯½™i dung)");
      ensureDocEndsWithHetMarker(body);
      return true;
    }

    // Process each segment
    var imageCount = 0;
    var MAX_IMAGES = 10;

    for (var si = 0; si < segments.length; si++) {
      var seg = segments[si];

      if (seg.kind === "marker") {
        // Write block marker as a plain-text paragraph in the Doc
        body.appendParagraph(seg.value);
        Logger.log("Wrote marker: " + seg.value);
        continue;
      }

      // seg.kind === "html" 뿯½뿯₽” process the HTML chunk with parseHtmlBlocks
      var htmlChunk = seg.value;
      if (!htmlChunk || !htmlChunk.trim()) continue;

      var blocks = parseHtmlBlocks(htmlChunk);

      if (blocks.length === 0) {
        // Fallback: try to extract plain text from the chunk
        var plainText = stripHtml(htmlChunk);
        if (plainText && plainText.trim()) {
          var lines = plainText.split(/\n+/);
          for (var li = 0; li < lines.length; li++) {
            if (lines[li].trim()) {
              body.appendParagraph(lines[li].trim());
            }
          }
        }
        continue;
      }

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];

        switch (block.type) {
          case 'h1':
            var h1p = body.appendParagraph(block.text || '');
            h1p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
            break;

          case 'h2':
            var h2p = body.appendParagraph(block.text || '');
            h2p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
            break;

          case 'h3':
            var h3p = body.appendParagraph(block.text || '');
            h3p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
            break;

          case 'p':
          case 'div':
            if (block.text && block.text.trim()) {
              body.appendParagraph(block.text);
            }
            break;

          case 'ul':
            if (block.items && block.items.length > 0) {
              for (var j = 0; j < block.items.length; j++) {
                var uli = body.appendListItem(block.items[j]);
                uli.setGlyphType(DocumentApp.GlyphType.BULLET);
              }
            }
            break;

          case 'ol':
            if (block.items && block.items.length > 0) {
              for (var j2 = 0; j2 < block.items.length; j2++) {
                var oli = body.appendListItem(block.items[j2]);
                oli.setGlyphType(DocumentApp.GlyphType.NUMBER);
              }
            }
            break;

          case 'table':
            if (block.rows && block.rows.length > 0) {
              var table = body.appendTable(block.rows);

              // Style header row when source table has <th> in first row
              if (block.hasHeader && table.getNumRows() > 0) {
                var headerRow = table.getRow(0);
                for (var hc = 0; hc < headerRow.getNumCells(); hc++) {
                  var headerCell = headerRow.getCell(hc);
                  try {
                    headerCell.setBackgroundColor('#eef3fb');
                    var headerText = headerCell.editAsText();
                    if (headerText) {
                      headerText.setBold(true);
                    }
                  } catch (headerErr) {
                    Logger.log('Header cell style error: ' + headerErr.toString());
                  }
                }
              }

              body.appendParagraph('');
            }
            break;

          case 'pre':
            var codePara = body.appendParagraph(block.text || '');
            codePara.setFontFamily('Consolas');
            codePara.setBackgroundColor('#f1f3f4');
            break;

          case 'codeblock':
            var codeHeader = body.appendParagraph('뿯½Ÿ“뿯½ ' + (block.language || 'Code').toUpperCase());
            codeHeader.setFontFamily('Arial');
            codeHeader.setForegroundColor('#666666');
            codeHeader.setFontSize(10);

            var codeBody = body.appendParagraph(block.text || '');
            codeBody.setFontFamily('Consolas');
            codeBody.setBackgroundColor('#f1f3f4');
            codeBody.setFontSize(11);
            break;

          case 'callout':
            var calloutPara = body.appendParagraph((block.icon || '') + ' ' + (block.text || ''));
            if (block.calloutType === 'note') {
              calloutPara.setBackgroundColor('#e8f5e9');
            } else if (block.calloutType === 'warning') {
              calloutPara.setBackgroundColor('#fff3e0');
            } else if (block.calloutType === 'info') {
              calloutPara.setBackgroundColor('#e3f2fd');
            } else if (block.calloutType === 'danger') {
              calloutPara.setBackgroundColor('#ffebee');
            }
            break;

          case 'image':
            try {
              if (!block.src || block.src.trim() === '') {
                body.appendParagraph('[H뿯½뿯½nh 뿯½뿯½뿯½nh: URL tr뿯½뿯½‘ng]');
                break;
              }
              if (imageCount >= MAX_IMAGES) {
                body.appendParagraph('[H뿯½뿯½nh 뿯½뿯½뿯½nh: ' + block.src + '] (b뿯½뿯½뿯½ qua - 뿯½‘뿯½뿯½ 뿯½‘뿯½뿯½뿯½t gi뿯½뿯½›i h뿯½뿯½뿯½n)');
                break;
              }
              imageCount++;
              var imageBlob = getImageBlobFromSrc(block.src);
              if (imageBlob) {
                appendResizedImageToDoc(body, imageBlob);
              } else {
                body.appendParagraph('[H뿯½뿯½nh 뿯½뿯½뿯½nh kh뿯½뿯½ng t뿯½뿯½뿯½i 뿯½‘뿯½뿯½뿯½뿯½뿯½c: ' + block.src + ']');
              }
            } catch (imgErr) {
              Logger.log("Image error: " + imgErr.toString() + " - URL: " + block.src);
              body.appendParagraph('[H뿯½뿯½nh 뿯½뿯½뿯½nh: ' + block.src + ']');
            }
            break;

          default:
            if (block.text && block.text.trim()) {
              body.appendParagraph(block.text);
            }
        }
      }
    }

    ensureCodeMarkersClosedInDoc(body);
    ensureDocEndsWithHetMarker(body);
    Logger.log("뿯½œ… HTML converted successfully");
    return true;
  } catch (error) {
    Logger.log("Error converting HTML to Doc: " + error.toString());
    // Fallback: just add plain text
    body.appendParagraph(html.replace(/<[^>]*>/g, ''));
    ensureCodeMarkersClosedInDoc(body);
    ensureDocEndsWithHetMarker(body);
    return false;
  }
}

/**
 * Split HTML content (with embedded [[MARKER]] text) into an ordered array of segments.
 * Each segment is either { kind:"marker", value:"[[NOTE]]" } or { kind:"html", value:"<p>...</p>" }.
 *
 * The regex matches all known block markers:
 *   Opening: [[NOTE]], [[TIP]], [[CODE:PYTHON]], [[TERMINAL]], [[GRID]], [[FIGURE:caption]], [[COLOR:RED]], etc.
 *   Closing: [[/NOTE]], [[/CODE]], [[/TERMINAL]], [[/GRID]], [[/FIGURE]], [[/COLOR]], etc.
 *
 * @param {string} content - HTML string with embedded markers
 * @returns {Array<{kind:string, value:string}>}
 */
function splitContentIntoSegments(content) {
  var segments = [];
  if (!content) return segments;

  // Regex to match any block marker (opening or closing).
  // Opening examples: [[NOTE]], [[CODE:PYTHON]], [[FIGURE:some caption]], [[COLOR:RED]], [[TERMINAL]]
  // Closing examples: [[/NOTE]], [[/CODE]], [[/TERMINAL]], [[/GRID]], [[/FIGURE]], [[/COLOR]]
  var markerRegex = /\[\[\/?(?:NOTE|TIP|WARNING|HIGHLIGHT|EXAMPLE|CHECKPOINT|TASK|QA|RESOURCES|TERMINAL|GRID|CMD|OUTPUT|CODE(?::\w+)?|FIGURE(?::[^\]]*)?|COLOR(?::\w+)?)\]\]/gi;

  var lastIndex = 0;
  var match;

  while ((match = markerRegex.exec(content)) !== null) {
    // Push the HTML chunk before this marker (if any)
    if (match.index > lastIndex) {
      var htmlBefore = content.substring(lastIndex, match.index);
      // Strip wrapping </p>, </div> at the trailing end (from patterns like: <p>text</p><p>[[NOTE]]</p>)
      htmlBefore = htmlBefore.replace(/\s*<\/(?:p|div)>\s*$/i, '');
      // Strip dangling opening <p> or <div> at the trailing end (from patterns like: <p>[[NOTE]]</p>
      // where the <p> before the marker text remains after the marker was extracted)
      htmlBefore = htmlBefore.replace(/\s*<(?:p|div)[^>]*>\s*$/i, '');
      if (htmlBefore.trim()) {
        segments.push({ kind: "html", value: htmlBefore });
      }
    }

    // Push the marker itself
    segments.push({ kind: "marker", value: match[0] });

    lastIndex = match.index + match[0].length;

    // Skip trailing </p> or </div> immediately after marker (from wrapping like <p>[[NOTE]]</p>)
    var afterMarker = content.substring(lastIndex);
    var closingTagMatch = afterMarker.match(/^\s*<\/(?:p|div)>/i);
    if (closingTagMatch) {
      lastIndex += closingTagMatch[0].length;
    }
    // Also skip leading opening <p> or <div> tag right after marker+closing (from patterns like
    // </p><p> between two consecutive markers: <p>[[NOTE]]</p><p>content</p><p>[[/NOTE]]</p>)
    afterMarker = content.substring(lastIndex);
    var openingTagAfter = afterMarker.match(/^\s*<(?:p|div)[^>]*>\s*(?=\[\[)/i);
    if (openingTagAfter) {
      lastIndex += openingTagAfter[0].length;
    }
  }

  // Push remaining HTML after the last marker
  if (lastIndex < content.length) {
    var remaining = content.substring(lastIndex);
    if (remaining.trim()) {
      segments.push({ kind: "html", value: remaining });
    }
  }

  // If no markers were found at all, treat the entire content as one HTML segment
  if (segments.length === 0 && content.trim()) {
    segments.push({ kind: "html", value: content });
  }

  Logger.log("splitContentIntoSegments: " + segments.length + " segments (" +
    segments.filter(function(s) { return s.kind === "marker"; }).length + " markers, " +
    segments.filter(function(s) { return s.kind === "html"; }).length + " html chunks)");

  return segments;
}

/**
 * Normalize CODE markers and auto-repair missing [[/CODE]] closures.
 * Applies to both create topic and update topic flows because both use convertHtmlToDocContent.
 * @param {string} html
 * @returns {string}
 */
function normalizeCodeMarkersInHtml(html) {
  var normalized = String(html || "");

  // Repair bracket markers when editor/export wraps parts with inline formatting tags.
  // Example: [<span>[</span><span>CODE:PYTHON</span><span>]</span><span>]</span>
  // Only strip inline tags (span, b, i, em, strong, font, etc.), NOT block-level tags (p, div, h1-h6).
  var inlineTag = '<\\/?(?:span|b|i|u|em|strong|font|a|s|sub|sup|mark|abbr|small|big|del|ins|cite|q|dfn|var|samp|kbd|wbr|bdo|bdi|ruby|rt|rp|data|time|output)(?:\\s[^>]*)?>'; 
  var bracketOpenRe = new RegExp('(' + inlineTag + ')*\\[(' + inlineTag + ')*', 'gi');
  var bracketCloseRe = new RegExp('(' + inlineTag + ')*\\](' + inlineTag + ')*', 'gi');
  normalized = normalized.replace(bracketOpenRe, "[");
  normalized = normalized.replace(bracketCloseRe, "]");
  normalized = normalized.replace(/\[\[([^\[\]]*?)\]\]/g, function (match, inner) {
    var cleanInner = String(inner || "").replace(/<[^>]*>/g, "").trim();
    return "[[" + cleanInner + "]]";
  });

  // Normalize opening CODE markers, keep language token if provided.
  normalized = normalized.replace(
    /\[\[\s*CODE\s*(?::\s*([^\]\s]+)\s*)?\]\]/gi,
    function (match, language) {
      var lang = String(language || "TEXT").trim().toUpperCase();
      return "[[CODE:" + lang + "]]";
    },
  );

  // Normalize closing CODE marker variants
  normalized = normalized.replace(/\[\[\s*\/\s*CODE\s*\]\]/gi, "[[/CODE]]");

  var openingCount = (normalized.match(/\[\[CODE(?::[^\]]+)?\]\]/gi) || []).length;
  var closingCount = (normalized.match(/\[\[\/CODE\]\]/gi) || []).length;

  if (closingCount < openingCount) {
    var missingClosings = openingCount - closingCount;
    Logger.log(
      "뿯½š뿯½뿯½뿯½뿯½ Detected missing [[/CODE]] markers: " +
        missingClosings +
        " (open=" +
        openingCount +
        ", close=" +
        closingCount +
        ")",
    );
    for (var i = 0; i < missingClosings; i++) {
      normalized += "<p>[[/CODE]]</p>";
    }
  }

  return normalized;
}

/**
 * Ensure CODE markers are balanced in final Google Doc body.
 * If there are more [[CODE:...]] than [[/CODE]], append missing closures.
 * @param {Body} body
 */
function ensureCodeMarkersClosedInDoc(body) {
  if (!body) return;

  var textChunks = [];
  for (var i = 0; i < body.getNumChildren(); i++) {
    var child = body.getChild(i);
    var childType = child.getType();
    if (childType === DocumentApp.ElementType.PARAGRAPH) {
      textChunks.push(child.asParagraph().getText());
    } else if (childType === DocumentApp.ElementType.LIST_ITEM) {
      textChunks.push(child.asListItem().getText());
    }
  }

  var allText = textChunks.join("\n");
  var openingCount = (allText.match(/\[\[CODE(?::[^\]]+)?\]\]/gi) || []).length;
  var closingCount = (allText.match(/\[\[\/CODE\]\]/gi) || []).length;

  if (closingCount < openingCount) {
    var missingClosings = openingCount - closingCount;
    Logger.log(
      "뿯½š뿯½뿯½뿯½뿯½ Repairing Doc CODE markers: append " +
        missingClosings +
        " missing [[/CODE]] (open=" +
        openingCount +
        ", close=" +
        closingCount +
        ")",
    );
    for (var j = 0; j < missingClosings; j++) {
      body.appendParagraph("[[/CODE]]");
    }
  }
}

/**
 * Ensure the Google Doc ends with centered "Hết".
 * Only appends when the last meaningful line is not already "Hết".
 * @param {Body} body
 */
function ensureDocEndsWithHetMarker(body) {
  if (!body) return;

  function normalizeLineText(text) {
    return String(text || "")
      .replace(/\u00A0/g, " ")
      .trim();
  }

  var lastMeaningfulText = "";
  for (var i = body.getNumChildren() - 1; i >= 0; i--) {
    var child = body.getChild(i);
    var childType = child.getType();
    var text = "";

    if (childType === DocumentApp.ElementType.PARAGRAPH) {
      text = child.asParagraph().getText();
    } else if (childType === DocumentApp.ElementType.LIST_ITEM) {
      text = child.asListItem().getText();
    } else {
      continue;
    }

    text = normalizeLineText(text);
    if (text) {
      lastMeaningfulText = text;
      break;
    }
  }

  if (lastMeaningfulText === "Hết") {
    // "Hết" already exists 뿯½뿯₽“ ensure it is centered (it may have lost alignment
    // after a round-trip through the web editor which strips center styling).
    for (var j = body.getNumChildren() - 1; j >= 0; j--) {
      var el = body.getChild(j);
      if (el.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var elText = normalizeLineText(el.asParagraph().getText());
        if (elText === "Hết") {
          el.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          break;
        }
      }
    }
    return;
  }

  var endParagraph = body.appendParagraph("Hết");
  endParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
}

/**
 * L뿯½뿯½뿯½y blob 뿯½뿯½뿯½nh t뿯½뿯½뿯½ src (data URL, Google Drive URL, Google Docs export URL, ho뿯½뿯½뿯½c URL th뿯½뿯½뿯½뿯½뿯½ng)
 * @param {string} src
 * @returns {Blob|null}
 */
function getImageBlobFromSrc(src) {
  var imageSrc = String(src || "").trim();
  if (!imageSrc) return null;

  // 1) Data URL (quan tr뿯½뿯½뿯½ng cho edit mode v뿯½뿯½ 뿯½뿯½뿯½nh c뿯½뿯½ c뿯½뿯½ th뿯½뿯½뿯ƽ 뿯½‘뿯½뿯½ 뿯½‘뿯½뿯½뿯½뿯½뿯½c normalize th뿯½뿯½nh base64)
  if (imageSrc.indexOf("data:") === 0) {
    var dataMatch = imageSrc.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/i);
    if (!dataMatch) return null;

    var mimeType = dataMatch[1] || "application/octet-stream";
    var meta = dataMatch[2] || "";
    var payload = String(dataMatch[3] || "");
    var isBase64 = /;base64/i.test(meta);

    try {
      if (isBase64) {
        // D뿯½뿯½뿯½n payload 뿯½‘뿯½뿯½뿯ƽ decode 뿯½뿯½•n 뿯½‘뿯½뿯½‹nh (tr뿯½뿯½nh xu뿯½뿯½‘ng d뿯½뿯½ng/kho뿯½뿯½뿯½ng tr뿯½뿯½뿯½ng, url-safe base64)
        payload = payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
        var bytes = Utilities.base64Decode(payload);
        return Utilities.newBlob(bytes, mimeType, "embedded_image");
      }
      var decodedText = decodeURIComponent(payload);
      return Utilities.newBlob(decodedText, mimeType, "embedded_image");
    } catch (dataError) {
      Logger.log("뿯½š뿯½뿯½뿯½뿯½ Data URL decode failed: " + dataError.toString());
      return null;
    }
  }

  // 2) Google Drive URL -> l뿯½뿯½뿯½y tr뿯½뿯½뿯½c ti뿯½뿯½뿯½p b뿯½뿯½뿯½ng DriveApp
  var drivePatterns = [
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?.*id=([a-zA-Z0-9_-]+)/
  ];

  for (var i = 0; i < drivePatterns.length; i++) {
    var driveMatch = imageSrc.match(drivePatterns[i]);
    if (driveMatch && driveMatch[1]) {
      try {
        Logger.log("Fetching image from Drive: " + driveMatch[1]);
        return DriveApp.getFileById(driveMatch[1]).getBlob();
      } catch (driveError) {
        Logger.log("뿯½š뿯½뿯½뿯½뿯½ Drive fetch failed: " + driveError.toString());
      }
      break;
    }
  }

  // 3) Fetch URL t뿯½뿯½뿯½ web, th뿯½뿯½뿯½ v뿯½뿯½›i OAuth tr뿯½뿯½뿯½뿯½›c cho googleusercontent/docsz
  try {
    var useAuth =
      imageSrc.indexOf("googleusercontent.com/") !== -1 ||
      imageSrc.indexOf("docs.google.com/") !== -1;

    var options = {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false
    };
    if (useAuth) {
      options.headers = { Authorization: "Bearer " + ScriptApp.getOAuthToken() };
    }

    var response = UrlFetchApp.fetch(imageSrc, options);
    if (response.getResponseCode() === 200) {
      return response.getBlob();
    }
    Logger.log("Image fetch failed: " + imageSrc + " - Status: " + response.getResponseCode());
  } catch (fetchError) {
    Logger.log("뿯½š뿯½뿯½뿯½뿯½ UrlFetch image failed: " + fetchError.toString());
  }

  return null;
}

/**
 * Th뿯½뿯½m 뿯½뿯½뿯½nh v뿯½뿯½o Google Doc v뿯½뿯½ t뿯½뿯½뿯½ thu nh뿯½뿯½뿯½ theo gi뿯½뿯½›i h뿯½뿯½뿯½n c뿯½뿯½뿯½u h뿯½뿯½nh, gi뿯½뿯½뿯½ t뿯½뿯½‰ l뿯½뿯½‡ g뿯½뿯½‘c.
 * @param {Body} body
 * @param {Blob} imageBlob
 * @returns {InlineImage|null}
 */
function appendResizedImageToDoc(body, imageBlob) {
  try {
    var image = body.appendImage(imageBlob);
    var parent = image.getParent();
    if (parent && parent.getType && parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
      parent.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
    var maxWidth = Number(TOPIC_EDITOR_CONFIG.DOC_IMAGE_MAX_WIDTH) || 520;
    var maxHeight = Number(TOPIC_EDITOR_CONFIG.DOC_IMAGE_MAX_HEIGHT) || 700;

    var originalWidth = image.getWidth();
    var originalHeight = image.getHeight();

    if (!originalWidth || !originalHeight) {
      return image;
    }

    var widthRatio = maxWidth / originalWidth;
    var heightRatio = maxHeight / originalHeight;
    var scale = Math.min(widthRatio, heightRatio, 1); // Kh뿯½뿯½ng ph뿯½뿯½ng to 뿯½뿯½뿯½nh nh뿯½뿯½뿯½

    if (scale < 1) {
      image.setWidth(Math.round(originalWidth * scale));
      image.setHeight(Math.round(originalHeight * scale));
    }

    return image;
  } catch (error) {
    Logger.log("뿯½š뿯½뿯½뿯½뿯½ appendResizedImageToDoc error: " + error.toString());
    return null;
  }
}

/**
 * Extract content from div elements (common in contenteditable)
 */
function extractDivContent(html) {
  const results = [];
  const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = divRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text.trim()) {
      results.push(text);
    }
  }

  return results;
}

/**
 * Parse HTML th뿯½뿯½nh c뿯½뿯½c block elements
 * @param {string} html - N뿯½뿯½™i dung HTML
 * @returns {Array} - M뿯½뿯½뿯½ng c뿯½뿯½c block objects
 */
function parseHtmlBlocks(html) {
  const blocks = [];

  Logger.log("=== PARSE HTML BLOCKS ===");
  Logger.log("HTML length: " + (html ? html.length : 0));

  if (!html || html.trim() === '') {
    Logger.log("Empty HTML, returning empty blocks");
    return blocks;
  }

  // Regex patterns for different elements - ORDERED by specificity (most specific first)
  const patterns = [
    { regex: /<h1[^>]*>([\s\S]*?)<\/h1>/gi, type: 'h1' },
    { regex: /<h2[^>]*>([\s\S]*?)<\/h2>/gi, type: 'h2' },
    { regex: /<h3[^>]*>([\s\S]*?)<\/h3>/gi, type: 'h3' },
    // Code block with language tag
    { regex: /<div class="code-block"[^>]*data-language="([^"]*)"[^>]*>[\s\S]*?<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>[\s\S]*?<\/div>/gi, type: 'codeblock' },
    { regex: /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, type: 'pre' },
    { regex: /<pre[^>]*>([\s\S]*?)<\/pre>/gi, type: 'pre' },
    { regex: /<table[^>]*>([\s\S]*?)<\/table>/gi, type: 'table' },
    { regex: /<ul[^>]*>([\s\S]*?)<\/ul>/gi, type: 'ul' },
    { regex: /<ol[^>]*>([\s\S]*?)<\/ol>/gi, type: 'ol' },
    // Callout blocks
    { regex: /<div class="callout callout-(\w+)"[^>]*>[\s\S]*?<span class="callout-icon"[^>]*>([^<]*)<\/span>[\s\S]*?<div class="callout-content"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi, type: 'callout' },
    // Image wrapper with img inside
    { regex: /<div[^>]*class=(["'])[^"']*\bimage-wrapper\b[^"']*\1[^>]*>[\s\S]*?<img[^>]*src=(["'])(.*?)\2[^>]*>[\s\S]*?<\/div>/gi, type: 'image', srcGroup: 3 },
    { regex: /<img[^>]*src=(["'])(.*?)\1[^>]*>/gi, type: 'image', srcGroup: 2 },
    { regex: /<p[^>]*>([\s\S]*?)<\/p>/gi, type: 'p' },
    // Generic div (common from contenteditable) - must be last
    { regex: /<div[^>]*>([\s\S]*?)<\/div>/gi, type: 'div' }
  ];
  
  // Create a working copy
  let workingHtml = html;
  
  // Track positions of all matches
  const allMatches = [];
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let matchCount = 0;
    const MAX_MATCHES = 200; // Gi뿯½뿯½›i h뿯½뿯½뿯½n s뿯½뿯½‘ l뿯½뿯½뿯½n match 뿯½‘뿯½뿯½뿯ƽ tr뿯½뿯½nh timeout

    while ((match = regex.exec(html)) !== null && matchCount < MAX_MATCHES) {
      matchCount++;
      const matchData = {
        type: pattern.type,
        index: match.index,
        length: match[0].length,
        fullMatch: match[0]
      };
      
      if (pattern.type === 'ul' || pattern.type === 'ol') {
        // Extract list items
        const items = [];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch;
        while ((liMatch = liRegex.exec(match[1])) !== null) {
          items.push(stripHtml(liMatch[1]));
        }
        matchData.items = items;
      } else if (pattern.type === 'table') {
        const tableInnerHtml = match[1] || '';
        const rows = [];
        let hasHeader = false;
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;

        while ((trMatch = trRegex.exec(tableInnerHtml)) !== null) {
          const rowHtml = trMatch[1] || '';
          const rowCells = [];
          const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
          let cellMatch;
          let rowHasTh = false;

          while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
            if ((cellMatch[1] || '').toLowerCase() === 'th') {
              rowHasTh = true;
            }
            rowCells.push(stripHtml(cellMatch[2] || ''));
          }

          if (rowCells.length > 0) {
            if (rows.length === 0 && rowHasTh) {
              hasHeader = true;
            }
            rows.push(rowCells);
          }
        }

        matchData.rows = rows;
        matchData.hasHeader = hasHeader;
      } else if (pattern.type === 'codeblock') {
        // Code block with language
        matchData.language = match[1] || 'text';
        matchData.text = decodeHtmlEntities(match[2] || '');
      } else if (pattern.type === 'callout') {
        matchData.calloutType = match[1];
        matchData.icon = match[2];
        matchData.text = stripHtml(match[3]);
      } else if (pattern.type === 'image') {
        const srcValue = pattern.srcGroup ? match[pattern.srcGroup] : "";
        matchData.src = String(srcValue || "").trim();
      } else if (pattern.type === 'p') {
        const pInnerHtml = match[1] || "";
        // Tr뿯½뿯½nh 뿯½‘뿯½뿯½뿯ƽ <p> ch뿯½뿯½뿯½a 뿯½뿯½뿯½nh/code/list b뿯½뿯½‹ parse th뿯½뿯½nh text v뿯½뿯½ l뿯½뿯½m r뿯½뿯½i block con.
        if (/<img\b|<ul\b|<ol\b|<pre\b|<table\b|<div\b|<h[1-6]\b|class=(["'])[^"']*\b(?:image-wrapper|code-block|callout|editor-table-wrapper)\b[^"']*\1/i.test(pInnerHtml)) {
          continue;
        }
        matchData.text = stripHtml(pInnerHtml);
      } else if (pattern.type === 'div') {
        const divInnerHtml = match[1] || "";
        // Tr뿯½뿯½nh 뿯½‘뿯½뿯½뿯ƽ generic div nu뿯½뿯½‘t m뿯½뿯½뿯½t c뿯½뿯½c block 뿯½‘뿯½뿯½뿯½c th뿯½뿯½ (뿯½‘뿯½뿯½뿯½c bi뿯½뿯½‡t l뿯½뿯½ 뿯½뿯½뿯½nh).
        if (/<img\b|<ul\b|<ol\b|<pre\b|<table\b|<h[1-6]\b|class=(["'])[^"']*\b(?:image-wrapper|code-block|callout|editor-table-wrapper)\b[^"']*\1/i.test(divInnerHtml)) {
          continue;
        }
        matchData.text = stripHtml(divInnerHtml);
      } else {
        matchData.text = stripHtml(match[1] || '');
      }
      
      allMatches.push(matchData);
    }
  }

  // Sort by position
  const priority = {
    image: 90,
    codeblock: 80,
    callout: 80,
    pre: 70,
    table: 75,
    ul: 70,
    ol: 70,
    h1: 60,
    h2: 60,
    h3: 60,
    p: 40,
    div: 10
  };
  allMatches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    const pa = priority[a.type] || 0;
    const pb = priority[b.type] || 0;
    if (pa !== pb) return pb - pa;
    return b.length - a.length;
  });

  // Remove nested/overlapping matches
  const finalMatches = [];
  let lastEnd = 0;

  for (const match of allMatches) {
    if (match.index >= lastEnd) {
      finalMatches.push(match);
      lastEnd = match.index + match.length;
    }
  }

  Logger.log("Total matches found: " + allMatches.length);
  Logger.log("Final blocks after filtering: " + finalMatches.length);

  return finalMatches;
}

/**
 * X뿯½뿯½a HTML tags v뿯½뿯½ gi뿯½뿯½뿯½ l뿯½뿯½뿯½i text
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Decode HTML entities (d뿯½뿯½ng cho code blocks)
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function getTopicContentChecklist_(topicId) {
  const topicsResult = getAllTopicsIncludingHidden();
  const allTopics = topicsResult && topicsResult.topics ? topicsResult.topics : [];
  const topic = allTopics.find(t => String(t.topicId) === String(topicId));
  if (!topic) return { LT: false, MM: false, QZ: false, MC: false };
  return {
    LT: Boolean(topic.hasTheory),
    MM: Boolean(topic.hasMindmap),
    QZ: Boolean(topic.hasQuiz),
    MC: Boolean(topic.hasMatching)
  };
}

function isTopicContentComplete_(checklist) {
  return checklist.LT === true && checklist.MM === true && checklist.QZ === true && checklist.MC === true;
}

function syncTopicVisibilityAfterContentChange_(topicId) {
  try {
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    
    const checklist = getTopicContentChecklist_(topicId);
    const complete = isTopicContentComplete_(checklist);

    if (!complete) {
      const sheet = getSheet("Topics");
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const topicIdIdx = headers.indexOf("topicId");
        let isHiddenIdx = headers.indexOf("isHidden");
        
        if (topicIdIdx !== -1 && isHiddenIdx !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (data[i][topicIdIdx] === topicId) {
              sheet.getRange(i + 1, isHiddenIdx + 1).setValue(true);
              break;
            }
          }
        }
      }
      if (typeof clearTopicsCache === 'function') clearTopicsCache();
    }
    
    return {
      complete: complete,
      checklist: checklist,
      isVisible: complete ? null : false
    };
  } catch (error) {
    Logger.log("Error syncing topic visibility: " + error.toString());
  }
}

/**
 * Ki뿯½뿯½뿯ƽm tra topicId 뿯½‘뿯½뿯½ t뿯½뿯½“n t뿯½뿯½뿯½i ch뿯½뿯½a
 */
function checkTopicIdExists(topicId) {
  try {
    const sheet = getSheet("Topics");
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdIndex = headers.indexOf("topicId");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdIndex] === topicId) {
        return true;
      }
    }
    return false;
  } catch (error) {
    Logger.log("Error checking topicId: " + error.toString());
    return false;
  }
}

function updateTopicLockStatus(topicId, isHiddenVal) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return { success: false, message: "Kh\u00f4ng c\u00f3 quy\u1ec1n admin" };
    }

    if (!isHiddenVal) {
      const checklist = getTopicContentChecklist_(topicId);
      if (!isTopicContentComplete_(checklist)) {
        const missing = [];
        if (!checklist.LT) missing.push('Lý thuyết');
        if (!checklist.MM) missing.push('Mindmap');
        if (!checklist.QZ) missing.push('Quiz');
        if (!checklist.MC) missing.push('Matching');
        
        isHiddenVal = true;
        
        const sheet = getSheet("Topics");
        if (sheet) {
          const data = sheet.getDataRange().getValues();
          const headers = data[0];
          const topicIdIdx = headers.indexOf("topicId");
          const isHiddenIdx = headers.indexOf("isHidden");
          if (topicIdIdx !== -1 && isHiddenIdx !== -1) {
            for (let i = 1; i < data.length; i++) {
              if (data[i][topicIdIdx] === topicId) {
                sheet.getRange(i + 1, isHiddenIdx + 1).setValue(true);
                break;
              }
            }
          }
          if (typeof clearTopicsCache === 'function') clearTopicsCache();
        }
        
        return { success: false, code: 'TOPIC_CONTENT_INCOMPLETE', message: "Bài học chưa có đầy đủ nội dung. Thiếu: " + missing.join(", ") };
      }
    }

    const sheet = getSheet("Topics");
    if (!sheet) return { success: false, message: "Kh\u00f4ng t\u00ecm th\u1ea5y c\u01a1 s\u1edf d\u1eef li\u1ec7u Topics" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdIdx = headers.indexOf("topicId");
    let isHiddenIdx = headers.indexOf("isHidden");

    if (topicIdIdx === -1) {
      return { success: false, message: "C\u1ea5u tr\u00fac d\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7 (thi\u1ebfu topicId)" };
    }

    if (isHiddenIdx === -1) {
      isHiddenIdx = headers.length;
      sheet.getRange(1, isHiddenIdx + 1).setValue("isHidden");
    }

    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdIdx] === topicId) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow === -1) {
      return { success: false, message: "Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i h\u1ecdc c\u00f3 ID: " + topicId };
    }

    sheet.getRange(foundRow, isHiddenIdx + 1).setValue(Boolean(isHiddenVal));
    
    try {
      if (typeof clearTopicsCache === 'function') {
        clearTopicsCache();
      }
    } catch (e) {
      Logger.log("Could not clear cache: " + e.toString());
    }

    return { success: true, message: isHiddenVal ? "\u0110\u00e3 \u1ea9n ch\u1ee7 \u0111\u1ec1 kh\u1ecfi h\u1ecdc vi\u00ean" : "\u0110\u00e3 b\u1eadt hi\u1ec3n th\u1ecb ch\u1ee7 \u0111\u1ec1" };
  } catch (error) {
    Logger.log("Error updating topic visibility status: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * L뿯½뿯½u topic v뿯½뿯½o MasterDB
 */
function saveTopicToMasterDB(topicData) {
  try {
    const sheet = getSheet("Topics");
    if (!sheet) return { success: false, message: "Không tìm thấy sheet Topics" };
    
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    ["contentDocUrl", "courseId", "xpReward", "quizXpReward", "matchingXpReward", "isHidden"].forEach(colName => {
      if (headers.indexOf(colName) === -1) {
        const newColIndex = headers.length + 1;
        sheet.getRange(1, newColIndex).setValue(colName);
        headers.push(colName);
      }
    });
    
    const rowData = [];
    const now = new Date().toISOString();
    
    for (const header of headers) {
      switch (header) {
        case "topicId": rowData.push(topicData.topicId); break;
        case "title": rowData.push(topicData.title); break;
        case "description": rowData.push(topicData.description || ""); break;
        case "courseId": rowData.push(topicData.courseId || ""); break;
        case "category": rowData.push(topicData.category || ""); break;
        case "iconUrl": rowData.push(topicData.iconUrl || ""); break;
        case "estimatedTime": rowData.push(topicData.estimatedTime || ""); break;
        case "prerequisiteTopics": rowData.push(topicData.prerequisiteTopics || ""); break;
        case "unlockCondition": rowData.push(topicData.unlockCondition || ""); break;
        case "order": rowData.push(topicData.order || 999); break;
        case "contentDocId": rowData.push(topicData.contentDocId); break;
        case "contentDocUrl": rowData.push(topicData.contentDocUrl || ""); break;
        case "createdBy": rowData.push(topicData.createdBy || "ADMIN"); break;
        case "createdAt": rowData.push(now); break;
        case "updatedAt": rowData.push(now); break;
        case "isLocked": rowData.push(!!topicData.isLocked); break;
        case "xpReward": rowData.push(topicData.xpReward !== undefined && topicData.xpReward !== "" ? Number(topicData.xpReward) : 100); break;
        case "quizXpReward": rowData.push(topicData.quizXpReward !== undefined && topicData.quizXpReward !== "" ? Number(topicData.quizXpReward) : 100); break;
        case "matchingXpReward": rowData.push(topicData.matchingXpReward !== undefined && topicData.matchingXpReward !== "" ? Number(topicData.matchingXpReward) : 100); break;
        case "isHidden": rowData.push(true); break;
        default: rowData.push("");
      }
    }
    
    if (topicData.order && topicData.order < 999) {
      if (topicData.courseId && typeof makeOrderRoomInCourse === "function") {
        makeOrderRoomInCourse(sheet, headers, sheet.getDataRange().getValues(), topicData.courseId, parseInt(topicData.order), null, topicData.topicId);
      } else if (typeof shiftTopicOrdersInCategory === "function") {
        shiftTopicOrdersInCategory(sheet, headers, sheet.getDataRange().getValues(), topicData.category, parseInt(topicData.order), null, topicData.topicId);
      }
    }
    
    sheet.appendRow(rowData);
    return { success: true, message: "Đã lưu topic vào MasterDB" };
  } catch (error) {
    return { success: false, message: "Lỗi lưu topic: " + error.toString() };
  }
}

/**
 * Adjust topic orders to make room for an inserted/moved topic
 */
function shiftTopicOrdersInCategory(sheet, headers, data, category, newOrder, oldOrder, excludeTopicId) {
  if (!newOrder || newOrder >= 999) return;
  const categoryIdx = headers.indexOf("category");
  const orderIdx = headers.indexOf("order");
  const topicIdIdx = headers.indexOf("topicId");
  
  if (categoryIdx === -1 || orderIdx === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    const rowCategory = data[i][categoryIdx];
    const rowTopicId = data[i][topicIdIdx];
    let rowOrder = parseInt(data[i][orderIdx]);
    
    if (rowCategory !== category || rowTopicId === excludeTopicId || isNaN(rowOrder) || rowOrder >= 999) {
      continue;
    }
    
    let shouldUpdate = false;
    
    if (oldOrder && oldOrder < 999 && oldOrder !== newOrder) {
      if (newOrder < oldOrder) {
        if (rowOrder >= newOrder && rowOrder < oldOrder) {
          rowOrder++;
          shouldUpdate = true;
        }
      } else {
        if (rowOrder > oldOrder && rowOrder <= newOrder) {
          rowOrder--;
          shouldUpdate = true;
        }
      }
    } else {
      if (rowOrder >= newOrder) {
        rowOrder++;
        shouldUpdate = true;
      }
    }
    
    if (shouldUpdate) {
      sheet.getRange(i + 1, orderIdx + 1).setValue(rowOrder);
    }
  }
}


/**
 * X뿯½뿯½a topic v뿯½뿯½ document Google Doc li뿯½뿯½n quan
 * @param {string} topicId - ID c뿯½뿯½뿯½a topic c뿯½뿯½뿯½n x뿯½뿯½a
 * @returns {Object} K뿯½뿯½뿯½t qu뿯½뿯½뿯½ x뿯½뿯½a
 */
function deleteTopicWithDoc(topicId) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext.success) return { success: false, message: adminContext.message || "Không có quyền admin" };

    const sheet = getSheet("Topics");
    if (!sheet) return { success: false, message: "Không tìm thấy sheet Topics" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdIndex = headers.indexOf("topicId");
    const contentDocIdIndex = headers.indexOf("contentDocId");
    const titleIndex = headers.indexOf("title");
    const courseIdIndex = headers.indexOf("courseId");
    const orderIndex = headers.indexOf("order");

    if (topicIdIndex === -1) return { success: false, message: "Không tìm thấy cột topicId trong sheet" };

    let rowIndex = -1;
    let contentDocId = null;
    let topicTitle = "";
    let courseId = "";
    let order = 999;

    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdIndex] === topicId) {
        rowIndex = i + 1;
        if (contentDocIdIndex !== -1) contentDocId = data[i][contentDocIdIndex];
        if (titleIndex !== -1) topicTitle = data[i][titleIndex];
        if (courseIdIndex !== -1) courseId = data[i][courseIdIndex];
        if (orderIndex !== -1) order = parseInt(data[i][orderIndex]) || 999;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: "Không tìm thấy topic với ID: " + topicId };

    let docDeleted = false;
    if (contentDocId) {
      try {
        DriveApp.getFileById(contentDocId).setTrashed(true);
        docDeleted = true;
      } catch (docError) {}
    }

    sheet.deleteRow(rowIndex);

    if (courseId && order < 999 && typeof closeOrderGapInCourse === "function") {
      closeOrderGapInCourse(sheet, headers, data, courseId, order);
    }

    try { clearTopicsCache(); } catch (cacheError) {}

    return {
      success: true,
      message: "Đã xóa bài học " + (topicTitle ? '"' + topicTitle + '"' : topicId) + " thành công!",
      docDeleted: docDeleted
    };
  } catch (error) {
    return { success: false, message: "Lỗi khi xóa topic: " + error.toString() };
  }
}

/**
 * L뿯½뿯½뿯½y danh s뿯½뿯½ch categories t뿯½뿯½뿯½ Topics hi뿯½뿯½‡n c뿯½뿯½
 * Tr뿯½뿯½뿯½ v뿯½뿯½뿯½ m뿯½뿯½뿯½ng categories tr뿯½뿯½뿯½c ti뿯½뿯½뿯½p
 */
function getTopicCategories() {
  try {
    const adminContext = (typeof requireAdminContext_ === 'function') ? requireAdminContext_() : getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return { success: false, message: "Không có quyền admin" };
    }
    
    var sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy cơ sở dữ liệu Topics" };
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var categoryIdx = headers.indexOf("category");
    
    if (categoryIdx === -1) {
      return { success: false, message: "Không tìm thấy cột category" };
    }

    var categories = [];
    
    for (var i = 1; i < data.length; i++) {
      var cat = data[i][categoryIdx];
      if (cat && categories.indexOf(cat) === -1) {
        categories.push(cat);
      }
    }

    return {
      success: true,
      data: categories.sort()
    };
  } catch (error) {
    Logger.log("Error getting topic categories: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ========================================
// EDIT TOPIC - Load & Update
// ========================================

/**
 * L뿯½뿯½뿯½y th뿯½뿯½ng tin topic + n뿯½뿯½™i dung doc HTML 뿯½‘뿯½뿯½뿯ƽ edit
 * @param {string} topicId - ID c뿯½뿯½뿯½a topic c뿯½뿯½뿯½n edit
 * @returns {object} { success, data: { topic, content } }
 */
function getTopicForEdit(topicId) {
  try {
    Logger.log("=== GET TOPIC FOR EDIT ===");
    Logger.log("Topic ID: " + topicId);

    // Ki뿯½뿯½뿯ƽm tra quy뿯½뿯½뿯½n admin
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message: (adminContext && adminContext.message) || "Kh뿯½뿯½ng th뿯½뿯½뿯ƽ x뿯½뿯½c th뿯½뿯½뿯½c quy뿯½뿯½뿯½n admin"
      };
    }

    // Validate
    if (!topicId) {
      return { success: false, message: "Thi뿯½뿯½뿯½u Topic ID" };
    }

    // L뿯½뿯½뿯½y topic metadata t뿯½뿯½뿯½ sheet
    const sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Topics" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let topicRow = null;
    let topicRowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("topicId")] === topicId) {
        topicRow = data[i];
        topicRowIndex = i;
        break;
      }
    }

    if (!topicRow) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y topic: " + topicId };
    }

    // Build topic object
    var topic = {
      topicId: topicRow[headers.indexOf("topicId")] || "",
      title: topicRow[headers.indexOf("title")] || "",
      description: topicRow[headers.indexOf("description")] || "",
      category: topicRow[headers.indexOf("category")] || "",
      order: topicRow[headers.indexOf("order")] || 999,
      iconUrl: topicRow[headers.indexOf("iconUrl")] || "",
      estimatedTime: topicRow[headers.indexOf("estimatedTime")] || "",
      courseId: headers.indexOf("courseId") >= 0 ? (topicRow[headers.indexOf("courseId")] || "") : "",
      
      prerequisiteTopics:
        headers.indexOf("prerequisiteTopics") >= 0
          ? String(topicRow[headers.indexOf("prerequisiteTopics")] || "")
          : "",

      unlockCondition:
        headers.indexOf("unlockCondition") >= 0
          ? String(topicRow[headers.indexOf("unlockCondition")] || "")
          : "",

      contentDocId: topicRow[headers.indexOf("contentDocId")] || "",
      contentDocUrl: topicRow[headers.indexOf("contentDocUrl")] || "",
      
      isLocked:
        topicRow[headers.indexOf("isLocked")] === true ||
        String(topicRow[headers.indexOf("isLocked")]).toLowerCase() === "true",

      xpReward:
        headers.indexOf("xpReward") >= 0 && topicRow[headers.indexOf("xpReward")] !== undefined && topicRow[headers.indexOf("xpReward")] !== ""
          ? Number(topicRow[headers.indexOf("xpReward")]) || 100
          : 100,
      quizXpReward:
        headers.indexOf("quizXpReward") >= 0 && topicRow[headers.indexOf("quizXpReward")] !== undefined && topicRow[headers.indexOf("quizXpReward")] !== ""
          ? Number(topicRow[headers.indexOf("quizXpReward")]) || 100
          : 100,
      matchingXpReward:
        headers.indexOf("matchingXpReward") >= 0 && topicRow[headers.indexOf("matchingXpReward")] !== undefined && topicRow[headers.indexOf("matchingXpReward")] !== ""
          ? Number(topicRow[headers.indexOf("matchingXpReward")]) || 100
          : 100
    };

    // L뿯½뿯½뿯½y n뿯½뿯½™i dung doc HTML
    var content = "";
    if (topic.contentDocId) {
      var docResult = getTopicContentByDocId(topic.contentDocId);
      if (docResult && docResult.success && docResult.content) {
        content = normalizeDocImagesForTopicEditor(docResult.content);
      }
    }

    Logger.log("뿯½œ… Topic loaded for edit: " + topic.title);
    Logger.log("Content length: " + content.length);

    return {
      success: true,
      data: {
        topic: topic,
        content: content
      }
    };
  } catch (error) {
    Logger.log("뿯½뿯½Œ Error getting topic for edit: " + error.toString());
    return {
      success: false,
      message: "L뿯½뿯½—i khi t뿯½뿯½뿯½i topic: " + error.toString()
    };
  }
}

/**
 * Chu뿯½뿯½뿯½n h뿯½뿯½a 뿯½뿯½뿯½nh t뿯½뿯½뿯½ Google Doc export 뿯½‘뿯½뿯½뿯ƽ hi뿯½뿯½뿯ƽn th뿯½뿯½‹ 뿯½뿯½•n 뿯½‘뿯½뿯½‹nh trong Topic Editor.
 * Google Doc th뿯½뿯½뿯½뿯½뿯½ng tr뿯½뿯½뿯½ URL d뿯½뿯½뿯½ng docsz/googleusercontent t뿯½뿯½뿯½m th뿯½뿯½뿯½i, c뿯½뿯½ th뿯½뿯½뿯ƽ kh뿯½뿯½ng render 뿯½‘뿯½뿯½뿯½뿯½뿯½c 뿯½뿯½Ÿ client.
 * H뿯½뿯½m n뿯½뿯½y 뿯½‘뿯½뿯½•i c뿯½뿯½c 뿯½뿯½뿯½nh 뿯½‘뿯½뿯½ sang data URL 뿯½‘뿯½뿯½뿯ƽ khi m뿯½뿯½Ÿ m뿯½뿯½n h뿯½뿯½nh edit v뿯½뿯½뿯½n th뿯½뿯½뿯½y 뿯½뿯½뿯½nh.
 *
 * @param {string} html
 * @returns {string}
 */
function normalizeDocImagesForTopicEditor(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  var imgRegex = /<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi;

  var normalized = html.replace(imgRegex, function (fullMatch, preAttr, quote, src, postAttr) {
    var originalSrc = String(src || "").trim();
    if (!originalSrc) return fullMatch;

    // Keep already-stable/public URLs as-is.
    if (
      originalSrc.indexOf("data:") === 0 ||
      originalSrc.indexOf("lh3.googleusercontent.com/d/") !== -1 ||
      originalSrc.indexOf("drive.google.com/uc?") !== -1 ||
      originalSrc.indexOf("drive.google.com/file/d/") !== -1
    ) {
      return fullMatch;
    }

    // Ch뿯½뿯½‰ x뿯½뿯½뿯½ l뿯½뿯½ nh뿯½뿯½m URL 뿯½뿯½뿯½nh export t뿯½뿯½뿯½ Google Docs.
    var isGoogleDocExportImage =
      originalSrc.indexOf("googleusercontent.com/docsz/") !== -1 ||
      originalSrc.indexOf("googleusercontent.com/docs/") !== -1 ||
      originalSrc.indexOf("googleusercontent.com/") !== -1;

    if (!isGoogleDocExportImage) {
      return fullMatch;
    }

    try {
      var response = UrlFetchApp.fetch(originalSrc, {
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
        followRedirects: true
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(
          "뿯½š뿯½뿯½뿯½뿯½ normalizeDocImagesForTopicEditor: cannot fetch image (" +
            response.getResponseCode() +
            "): " +
            originalSrc,
        );
        return fullMatch;
      }

      var blob = response.getBlob();
      var mimeType = blob.getContentType() || "image/png";
      var bytes = blob.getBytes();
      var base64 = Utilities.base64Encode(bytes);
      var dataUrl = "data:" + mimeType + ";base64," + base64;

      return (
        "<img" +
        (preAttr || "") +
        'src="' +
        dataUrl +
        '"' +
        (postAttr || "") +
        ">"
      );
    } catch (imageError) {
      Logger.log(
        "뿯½š뿯½뿯½뿯½뿯½ normalizeDocImagesForTopicEditor error: " + imageError.toString(),
      );
      return fullMatch;
    }
  });
  return normalized;
}

/**
 * Lấy thông tin topic + n뿯½뿯½™i dung doc HTML 뿯½‘뿯½뿯½뿯ƽ edit
 * @param {string} topicId - ID c뿯½뿯½뿯½a topic c뿯½뿯½뿯½n edit
 * @returns {object} { success, data: { topic, content } }
 */
function getTopicForEdit(topicId) {
  try {
    Logger.log("=== GET TOPIC FOR EDIT ===");
    Logger.log("Topic ID: " + topicId);

    // Ki뿯½뿯½뿯ƽm tra quy뿯½뿯½뿯½n admin
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message: (adminContext && adminContext.message) || "Kh뿯½뿯½ng th뿯½뿯½뿯ƽ x뿯½뿯½c th뿯½뿯½뿯½c quy뿯½뿯½뿯½n admin"
      };
    }

    // Validate
    if (!topicId) {
      return { success: false, message: "Thi뿯½뿯½뿯½u Topic ID" };
    }

    // L뿯½뿯½뿯½y topic metadata t뿯½뿯½뿯½ sheet
    const sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y sheet Topics" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let topicRow = null;
    let topicRowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("topicId")] === topicId) {
        topicRow = data[i];
        topicRowIndex = i;
        break;
      }
    }

    if (!topicRow) {
      return { success: false, message: "Kh뿯½뿯½ng t뿯½뿯½m th뿯½뿯½뿯½y topic: " + topicId };
    }

    // Build topic object
    var topic = {
      topicId: topicRow[headers.indexOf("topicId")] || "",
      title: topicRow[headers.indexOf("title")] || "",
      description: topicRow[headers.indexOf("description")] || "",
      category: topicRow[headers.indexOf("category")] || "",
      order: topicRow[headers.indexOf("order")] || 999,
      iconUrl: topicRow[headers.indexOf("iconUrl")] || "",
      estimatedTime: topicRow[headers.indexOf("estimatedTime")] || "",
      courseId: headers.indexOf("courseId") >= 0 ? (topicRow[headers.indexOf("courseId")] || "") : "",
      
      prerequisiteTopics:
        headers.indexOf("prerequisiteTopics") >= 0
          ? String(topicRow[headers.indexOf("prerequisiteTopics")] || "")
          : "",

      unlockCondition:
        headers.indexOf("unlockCondition") >= 0
          ? String(topicRow[headers.indexOf("unlockCondition")] || "")
          : "",

      contentDocId: topicRow[headers.indexOf("contentDocId")] || "",
      contentDocUrl: topicRow[headers.indexOf("contentDocUrl")] || "",
      
      isLocked:
        topicRow[headers.indexOf("isLocked")] === true ||
        String(topicRow[headers.indexOf("isLocked")]).toLowerCase() === "true",

      xpReward:
        headers.indexOf("xpReward") >= 0 && topicRow[headers.indexOf("xpReward")] !== undefined && topicRow[headers.indexOf("xpReward")] !== ""
          ? Number(topicRow[headers.indexOf("xpReward")]) || 100
          : 100,
      quizXpReward:
        headers.indexOf("quizXpReward") >= 0 && topicRow[headers.indexOf("quizXpReward")] !== undefined && topicRow[headers.indexOf("quizXpReward")] !== ""
          ? Number(topicRow[headers.indexOf("quizXpReward")]) || 100
          : 100,
      matchingXpReward:
        headers.indexOf("matchingXpReward") >= 0 && topicRow[headers.indexOf("matchingXpReward")] !== undefined && topicRow[headers.indexOf("matchingXpReward")] !== ""
          ? Number(topicRow[headers.indexOf("matchingXpReward")]) || 100
          : 100
    };

    // L뿯½뿯½뿯½y n뿯½뿯½™i dung doc HTML
    var content = "";
    if (topic.contentDocId) {
      var docResult = getTopicContentByDocId(topic.contentDocId);
      if (docResult && docResult.success && docResult.content) {
        content = normalizeDocImagesForTopicEditor(docResult.content);
      }
    }

    Logger.log("뿯½œ… Topic loaded for edit: " + topic.title);
    Logger.log("Content length: " + content.length);

    return {
      success: true,
      data: {
        topic: topic,
        content: content
      }
    };
  } catch (error) {
    Logger.log("뿯½뿯½Œ Error getting topic for edit: " + error.toString());
    return {
      success: false,
      message: "L뿯½뿯½—i khi t뿯½뿯½뿯½i topic: " + error.toString()
    };
  }
}

/**
 * Chu뿯½뿯½뿯½n h뿯½뿯½a 뿯½뿯½뿯½nh t뿯½뿯½뿯½ Google Doc export 뿯½‘뿯½뿯½뿯ƽ hi뿯½뿯½뿯ƽn th뿯½뿯½‹ 뿯½뿯½•n 뿯½‘뿯½뿯½‹nh trong Topic Editor.
 * Google Doc th뿯½뿯½뿯½뿯½뿯½ng tr뿯½뿯½뿯½ URL d뿯½뿯½뿯½ng docsz/googleusercontent t뿯½뿯½뿯½m th뿯½뿯½뿯½i, c뿯½뿯½ th뿯½뿯½뿯ƽ kh뿯½뿯½ng render 뿯½‘뿯½뿯½뿯½뿯½뿯½c 뿯½뿯½Ÿ client.
 * H뿯½뿯½m n뿯½뿯½y 뿯½‘뿯½뿯½•i c뿯½뿯½c 뿯½뿯½뿯½nh 뿯½‘뿯½뿯½ sang data URL 뿯½‘뿯½뿯½뿯ƽ khi m뿯½뿯½Ÿ m뿯½뿯½n h뿯½뿯½nh edit v뿯½뿯½뿯½n th뿯½뿯½뿯½y 뿯½뿯½뿯½nh.
 *
 * @param {string} html
 * @returns {string}
 */
function normalizeDocImagesForTopicEditor(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  var imgRegex = /<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi;

  var normalized = html.replace(imgRegex, function (fullMatch, preAttr, quote, src, postAttr) {
    var originalSrc = String(src || "").trim();
    if (!originalSrc) return fullMatch;

    // Keep already-stable/public URLs as-is.
    if (
      originalSrc.indexOf("data:") === 0 ||
      originalSrc.indexOf("lh3.googleusercontent.com/d/") !== -1 ||
      originalSrc.indexOf("drive.google.com/uc?") !== -1 ||
      originalSrc.indexOf("drive.google.com/file/d/") !== -1
    ) {
      return fullMatch;
    }

    // Ch뿯½뿯½‰ x뿯½뿯½뿯½ l뿯½뿯½ nh뿯½뿯½m URL 뿯½뿯½뿯½nh export t뿯½뿯½뿯½ Google Docs.
    var isGoogleDocExportImage =
      originalSrc.indexOf("googleusercontent.com/docsz/") !== -1 ||
      originalSrc.indexOf("googleusercontent.com/docs/") !== -1 ||
      originalSrc.indexOf("googleusercontent.com/") !== -1;

    if (!isGoogleDocExportImage) {
      return fullMatch;
    }

    try {
      var response = UrlFetchApp.fetch(originalSrc, {
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
        followRedirects: true
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(
          "뿯½š뿯½뿯½뿯½뿯½ normalizeDocImagesForTopicEditor: cannot fetch image (" +
            response.getResponseCode() +
            "): " +
            originalSrc,
        );
        return fullMatch;
      }

      var blob = response.getBlob();
      var mimeType = blob.getContentType() || "image/png";
      var bytes = blob.getBytes();
      var base64 = Utilities.base64Encode(bytes);
      var dataUrl = "data:" + mimeType + ";base64," + base64;

      return (
        "<img" +
        (preAttr || "") +
        'src="' +
        dataUrl +
        '"' +
        (postAttr || "") +
        ">"
      );
    } catch (imageError) {
      Logger.log(
        "뿯½š뿯½뿯½뿯½뿯½ normalizeDocImagesForTopicEditor error: " + imageError.toString(),
      );
      return fullMatch;
    }
  });

  return normalized;
}

/**
 * C뿯½뿯½뿯½p nh뿯½뿯½뿯½t topic: metadata in MasterDB + n뿯½뿯½™i dung Google Doc
 * @param {string} topicId - ID topic c뿯½뿯½뿯½n c뿯½뿯½뿯½p nh뿯½뿯½뿯½t
 * @param {object} topicData - { title, description, category, order, content }
 * @returns {object} { success, message }
 */
function updateTopicWithContent(topicId, topicData) {
  try {
    var adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return { success: false, message: (adminContext && adminContext.message) || "Không thể xác thực quyền admin" };
    }

    if (!topicId) return { success: false, message: "Thiếu Topic ID" };
    if (!topicData) return { success: false, message: "Không có dữ liệu cập nhật" };

    var sheet = getSheet("Topics");
    if (!sheet) return { success: false, message: "Không tìm thấy sheet Topics" };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var topicRowIndex = -1;
    var contentDocId = "";
    var contentDocUrl = "";

    for (var i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("topicId")] === topicId) {
        topicRowIndex = i;
        contentDocId = data[i][headers.indexOf("contentDocId")] || "";
        contentDocUrl = data[i][headers.indexOf("contentDocUrl")] || "";
        break;
      }
    }

    if (topicRowIndex === -1) return { success: false, message: "Không tìm thấy topic: " + topicId };

    var hasContentInPayload = Object.prototype.hasOwnProperty.call(topicData, "content");
    if (hasContentInPayload && !contentDocId) {
      return { success: false, message: "Topic chưa có Google Doc để cập nhật nội dung." };
    }

    var now = new Date().toISOString();
    var titleCol = headers.indexOf("title");
    var descCol = headers.indexOf("description");
    var categoryCol = headers.indexOf("category");
    var courseIdCol = headers.indexOf("courseId");
    var orderCol = headers.indexOf("order");
    var updatedAtCol = headers.indexOf("updatedAt");

    var rowNum = topicRowIndex + 1;

    if (titleCol >= 0 && topicData.title) sheet.getRange(rowNum, titleCol + 1).setValue(topicData.title);
    if (descCol >= 0 && topicData.description !== undefined) sheet.getRange(rowNum, descCol + 1).setValue(topicData.description || "");
    if (categoryCol >= 0 && topicData.category) sheet.getRange(rowNum, categoryCol + 1).setValue(topicData.category);
    if (courseIdCol >= 0 && topicData.courseId) sheet.getRange(rowNum, courseIdCol + 1).setValue(topicData.courseId);

    if (orderCol >= 0 && topicData.order !== undefined) {
      var oldOrderValue = parseInt(data[topicRowIndex][orderCol]);
      if (isNaN(oldOrderValue)) oldOrderValue = null;
      var newOrderValue = parseInt(topicData.order) || 999;
      
      if (newOrderValue < 999 && newOrderValue !== oldOrderValue) {
        var activeCourseId = topicData.courseId !== undefined ? topicData.courseId : (data[topicRowIndex][courseIdCol] || "");
        if (activeCourseId && typeof makeOrderRoomInCourse === "function") {
          makeOrderRoomInCourse(sheet, headers, data, activeCourseId, newOrderValue, oldOrderValue, topicId);
        } else if (typeof shiftTopicOrdersInCategory === "function") {
          var activeCategory = topicData.category !== undefined ? topicData.category : (data[topicRowIndex][categoryCol] || "");
          shiftTopicOrdersInCategory(sheet, headers, data, activeCategory, newOrderValue, oldOrderValue, topicId);
        }
      }
      sheet.getRange(rowNum, orderCol + 1).setValue(newOrderValue);
    }
    
    var prereqCol = headers.indexOf("prerequisiteTopics");
    var unlockCol = headers.indexOf("unlockCondition");
    var isLockedCol = headers.indexOf("isLocked");
    
    if (prereqCol >= 0 && topicData.prerequisiteTopics !== undefined) sheet.getRange(rowNum, prereqCol + 1).setValue(topicData.prerequisiteTopics);
    if (unlockCol >= 0 && topicData.unlockCondition !== undefined) sheet.getRange(rowNum, unlockCol + 1).setValue(topicData.unlockCondition);
    if (isLockedCol >= 0 && topicData.isLocked !== undefined) sheet.getRange(rowNum, isLockedCol + 1).setValue(topicData.isLocked);
    if (updatedAtCol >= 0) sheet.getRange(rowNum, updatedAtCol + 1).setValue(now);

    ["xpReward", "quizXpReward", "matchingXpReward"].forEach(function(colName) {
      if (topicData[colName] !== undefined && topicData[colName] !== "") {
        var colIndex = headers.indexOf(colName);
        if (colIndex === -1) {
          colIndex = headers.length;
          sheet.getRange(1, colIndex + 1).setValue(colName);
          headers.push(colName);
        }
        sheet.getRange(rowNum, colIndex + 1).setValue(Number(topicData[colName]) || 100);
      }
    });

    var docOperation = "none";
    if (contentDocId && hasContentInPayload) {
      try {
        var doc = DocumentApp.openById(contentDocId);
        var body = doc.getBody();
        body.clear();
        convertHtmlToDocContent(topicData.content || "", body);
        doc.saveAndClose();
        docOperation = "updated";
      } catch (docError) {
        return { success: false, message: "Đã cập nhật metadata nhưng lỗi khi cập nhật Doc: " + docError.toString() };
      }
    }

    try { clearTopicsCache(); } catch (e) {}

    return {
      success: true,
      message: "Đã cập nhật bài học thành công!",
      docOperation: docOperation,
      contentDocId: contentDocId,
      contentDocUrl: contentDocUrl
    };
  } catch (error) {
    return { success: false, message: "Lỗi khi cập nhật topic: " + error.toString() };
  }
}


// ==========================================
