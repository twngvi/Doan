/**
 * adminFunctions.js - Backend Functions for Admin Panel
 * 
 * Các hàm server-side cho Admin quản lý Users, Topics, Lessons
 */

// ========================================
// ADMIN ACCESS CONTROL
// ========================================

/**
 * Kiểm tra user có phải admin không
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
 * Set role ADMIN cho một user (chạy thủ công trong Apps Script Editor)
 * 
 * Cách dùng:
 * 1. Mở Google Apps Script Editor
 * 2. Chọn function: setUserAsAdmin
 * 3. Chạy và nhập email của user cần set làm admin
 */
function setUserAsAdmin() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Set User as Admin",
    "Nhập EMAIL của user cần set làm ADMIN:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const email = response.getResponseText().trim().toLowerCase();
  
  if (!email) {
    ui.alert("Lỗi", "Email không được để trống!", ui.ButtonSet.OK);
    return;
  }
  
  const result = setUserRole(email, "ADMIN");
  
  if (result.success) {
    ui.alert("Thành công!", result.message, ui.ButtonSet.OK);
  } else {
    ui.alert("Lỗi", result.message, ui.ButtonSet.OK);
  }
}

/**
 * Set role cho user (internal function)
 */
function setUserRole(email, role) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const roleIndex = headers.indexOf("role");
    
    if (emailIndex === -1 || roleIndex === -1) {
      return { success: false, message: "Không tìm thấy cột email hoặc role" };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex].toLowerCase() === email.toLowerCase()) {
        // Tìm thấy user, cập nhật role
        sheet.getRange(i + 1, roleIndex + 1).setValue(role);
        Logger.log("Set " + email + " as " + role);
        return { 
          success: true, 
          message: "Đã set " + email + " thành " + role + " thành công!" 
        };
      }
    }
    
    return { success: false, message: "Không tìm thấy user với email: " + email };
  } catch (error) {
    Logger.log("Error setting user role: " + error.toString());
    return { success: false, message: "Lỗi: " + error.toString() };
  }
}

/**
 * Tạo tài khoản admin mới (chạy 1 lần khi setup)
 */
function createAdminAccount() {
  const ui = SpreadsheetApp.getUi();
  
  // Prompt for email
  const emailResponse = ui.prompt(
    "Tạo Admin Account",
    "Nhập EMAIL cho tài khoản admin:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResponse.getResponseText().trim();
  
  // Prompt for password
  const passResponse = ui.prompt(
    "Tạo Admin Account",
    "Nhập PASSWORD cho tài khoản admin:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (passResponse.getSelectedButton() !== ui.Button.OK) return;
  const password = passResponse.getResponseText();
  
  // Prompt for display name
  const nameResponse = ui.prompt(
    "Tạo Admin Account",
    "Nhập TÊN HIỂN THỊ:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;
  const displayName = nameResponse.getResponseText().trim() || "Admin";
  
  // Create admin account
  const result = createAdminUser(email, password, displayName);
  
  if (result.success) {
    ui.alert("Thành công!", result.message, ui.ButtonSet.OK);
  } else {
    ui.alert("Lỗi", result.message, ui.ButtonSet.OK);
  }
}

/**
 * Internal function to create admin user
 */
function createAdminUser(email, password, displayName) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
    }
    
    // Check if email exists
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex].toLowerCase() === email.toLowerCase()) {
        return { success: false, message: "Email đã tồn tại!" };
      }
    }
    
    // Hash password
    const passwordHash = hashPassword(password);
    
    // Create new admin user
    const now = new Date();
    const userId = "USR_ADMIN_" + now.getTime();
    
    const newRow = [
      userId,           // userId
      "",               // googleId
      email,            // email
      displayName,      // displayName
      email.split("@")[0], // username
      passwordHash,     // passwordHash
      "",               // avatarUrl
      "ADMIN",          // role ⭐
      1,                // level
      1,                // aiLevel
      0,                // totalPoints
      0,                // totalXP
      0,                // currentStreak
      0,                // longestStreak
      now,              // lastActiveDate
      now,              // lastLogin
      now,              // createdAt
      true,             // isActive
      0,                // mountainPosition
      1,                // mountainStage
      0,                // mountainProgress
      0,                // totalQuizAnswered
      0,                // totalPuzzleSolved
      0,                // totalChallengeCompleted
      "",               // progressSheetId
      true,             // emailVerified ⭐ Admin không cần verify
      "",               // verificationToken
      "",               // verificationExpires
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log("Admin account created: " + email);
    
    return {
      success: true,
      message: "Đã tạo tài khoản Admin thành công!\nEmail: " + email + "\nPassword: [đã nhập]"
    };
  } catch (error) {
    Logger.log("Error creating admin: " + error.toString());
    return { success: false, message: "Lỗi: " + error.toString() };
  }
}

// ========================================
// ADMIN DASHBOARD STATS
// ========================================

/**
 * Lấy thống kê cho Admin Dashboard
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
 * Lấy thống kê AI usage cho admin theo user/topic/model
 * @param {object=} options - { days: number }
 * @returns {object}
 */
function getAdminAIUsageStats(options) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message: (adminContext && adminContext.message) || "Không thể xác thực quyền admin",
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
 * Lấy dữ liệu trạng thái hoạt động users cho Admin Online Stats
 * Quy ước:
 * - active: hoạt động trong 1 phút
 * - idle: hoạt động trong 5 phút
 * - offline: quá 5 phút hoặc chưa có hoạt động gần đây
 * - disabled: tài khoản bị khóa (isActive = false)
 */
function getAdminOnlineUsersData() {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
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
        "Người dùng";

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
            ? "Đang hoạt động"
            : status === "idle"
              ? "Tạm không hoạt động"
              : status === "disabled"
                ? "Tài khoản đã bị khóa"
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

    // Timeline đơn giản dựa trên hoạt động gần nhất
    const activities = users
      .filter(function(u) { return u.status === "active" || u.status === "idle"; })
      .slice(0, 10)
      .map(function(u) {
      return {
        type: u.status === "active" ? "activity" : "login",
        user: u.name,
        action: u.status === "active" ? "đang hoạt động" : "vừa online",
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
 * Lấy dữ liệu thống kê học tập/người chơi cho trang Admin User Stats.
 * Trả về format tương thích với views/admin/userStats/user_stats_scripts.html
 */
function getAdminUserLearningStats(options) {
  try {
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message:
          (adminContext && adminContext.message) ||
          "Không thể xác thực quyền admin",
      };
    }

    const safeOptions = options || {};
    const maxUsers = Math.max(1, Math.min(300, parseInt(safeOptions.maxUsers, 10) || 200));

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
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

    const topicTitleMap = getAdminTopicTitleMap_();
    const result = [];
    const totalTopicsInDb = getAdminTotalTopicsCount_();

    for (let i = 1; i < usersData.length; i++) {
      if (result.length >= maxUsers) break;

      const row = usersData[i];
      const role =
        userCols.role >= 0 ? String(row[userCols.role] || "").trim().toUpperCase() : "";

      // Chỉ thống kê tài khoản có vai trò USER.
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
            const topicTitle = topicTitleFromRow || topicTitleMap[topicId] || topicId;

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

            const attemptCount = tpCols.attempts >= 0 ? Math.max(0, parseInt(tpRow[tpCols.attempts], 10) || 0) : 0;

            lessonMap[topicId] = {
              lessonId: topicId,
              lessonTitle: topicTitle,
              progressPercent: progressPercent,
              attemptCount: attemptCount,
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
            const topicTitle = rowTopicTitle || topicTitleMap[topicId] || topicId || "Quiz";

            const percentage =
              qCols.percentage >= 0
                ? clampAdminPercent_(qRow[qCols.percentage])
                : deriveQuizPercent_(qCols.score >= 0 ? qRow[qCols.score] : 0, qCols.totalQuestions >= 0 ? qRow[qCols.totalQuestions] : 0);
            const correctAnswers = qCols.score >= 0 ? Math.max(0, parseInt(qRow[qCols.score], 10) || 0) : 0;
            const totalQuestions = qCols.totalQuestions >= 0 ? Math.max(0, parseInt(qRow[qCols.totalQuestions], 10) || 0) : 0;
            const quizMode = qCols.gameMode >= 0 && qRow[qCols.gameMode]
              ? String(qRow[qCols.gameMode]).trim().toLowerCase()
              : "instant";

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
            });

            if (topicId) {
              if (!lessonMap[topicId]) {
                lessonMap[topicId] = {
                  lessonId: topicId,
                  lessonTitle: topicTitle,
                  progressPercent: 0,
                  attemptCount: 0,
                  avgScore: 0,
                  _scoreSum: 0,
                  _scoreCount: 0,
                };
              }
              lessonMap[topicId].attemptCount++;
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
            const topicTitle = rowTopicTitle || topicTitleMap[topicId] || topicId || "Matching";
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
            });

            const playKey = "matching|" + (topicId || topicTitle);
            if (!playsMap[playKey]) {
              playsMap[playKey] = {
                mode: "Matching",
                topicId: topicId,
                topicTitle: topicTitle,
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

function getAdminTopicTitleMap_() {
  const map = {};

  try {
    const topicsSheet = getSheet("Topics");
    if (!topicsSheet || topicsSheet.getLastRow() <= 1) return map;

    const data = topicsSheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const titleCol = headers.indexOf("title");

    for (let i = 1; i < data.length; i++) {
      const topicId = topicIdCol >= 0 ? String(data[i][topicIdCol] || "").trim() : "";
      if (!topicId) continue;
      const title = titleCol >= 0 ? String(data[i][titleCol] || "").trim() : "";
      map[topicId] = title || topicId;
    }
  } catch (error) {
    Logger.log("Error building topic map: " + error.toString());
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
 * Heartbeat từ client để ghi nhận user còn đang mở web
 * payload: { userId?: string, email?: string, page?: string }
 */
function updateUserHeartbeat(payload) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
    }

    const safePayload = payload || {};
    const targetUserId = safePayload.userId ? String(safePayload.userId).trim() : "";
    const targetEmail = safePayload.email
      ? String(safePayload.email).trim().toLowerCase()
      : "";

    if (!targetUserId && !targetEmail) {
      return { success: false, message: "Thiếu userId/email" };
    }

    const lastSeenIndex = ensureUsersColumn(sheet, "lastSeenAt");
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: "Không có dữ liệu người dùng" };
    }

    const headers = data[0];
    const userIdIndex = headers.indexOf("userId");
    const emailIndex = headers.indexOf("email");
    const isActiveIndex = headers.indexOf("isActive");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowUserId = userIdIndex >= 0 ? String(row[userIdIndex] || "").trim() : "";
      const rowEmail =
        emailIndex >= 0 ? String(row[emailIndex] || "").trim().toLowerCase() : "";

      const matched =
        (targetUserId && rowUserId && targetUserId === rowUserId) ||
        (targetEmail && rowEmail && targetEmail === rowEmail);

      if (!matched) continue;

      if (isActiveIndex >= 0) {
        const isActiveFlag = row[isActiveIndex];
        if (
          isActiveFlag === false ||
          isActiveFlag === "false" ||
          isActiveFlag === "FALSE"
        ) {
          return { success: false, message: "Tài khoản đang bị khóa" };
        }
      }

      const now = new Date();
      sheet.getRange(i + 1, lastSeenIndex + 1).setValue(now);

      return {
        success: true,
        data: {
          userId: rowUserId,
          email: rowEmail,
          lastSeenAt: now.toISOString(),
        },
      };
    }

    return { success: false, message: "Không tìm thấy người dùng" };
  } catch (error) {
    Logger.log("Error updating heartbeat: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Parse dữ liệu ngày từ sheet (Date object hoặc string)
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
 * Lấy Date mới nhất trong 2 giá trị
 */
function getLatestAdminDate(dateA, dateB) {
  if (dateA && dateB) {
    return dateA.getTime() >= dateB.getTime() ? dateA : dateB;
  }
  return dateA || dateB || null;
}

/**
 * Đảm bảo cột tồn tại trong Users header, tạo mới ở cuối nếu thiếu
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
 * Lấy danh sách tất cả users cho Admin
 */
function getAllUsersForAdmin() {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
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
 * Cập nhật trạng thái user (khóa/mở khóa)
 */
function updateUserStatus(userId, isActive) {
  try {
    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
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
          message: isActive ? "Đã mở khóa user" : "Đã khóa user" 
        };
      }
    }
    
    return { success: false, message: "Không tìm thấy user" };
  } catch (error) {
    Logger.log("Error updating user status: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ========================================
// TOPICS MANAGEMENT
// ========================================

/**
 * Lấy danh sách Topics cho Admin (Content Management)
 * Trả về mảng topics trực tiếp để sử dụng trong giao diện quản lý
 */
function getAllTopicsForAdmin() {
  try {
    const sheet = getSheet("Topics");
    if (!sheet) {
      return [];
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return [];
    }

    const headers = data[0];
    const topics = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const topicId = row[headers.indexOf("topicId")];

      // Skip empty rows
      if (!topicId) continue;

      topics.push({
        topicId: topicId,
        title: row[headers.indexOf("title")] || '',
        description: row[headers.indexOf("description")] || '',
        category: row[headers.indexOf("category")] || '',
        order: row[headers.indexOf("order")] || i,
        iconUrl: row[headers.indexOf("iconUrl")] || '',
        estimatedTime: row[headers.indexOf("estimatedTime")] || '',
        prerequisiteTopics: row[headers.indexOf("prerequisiteTopics")] || '',
        isLocked: row[headers.indexOf("isLocked")] === true || row[headers.indexOf("isLocked")] === 'TRUE',
        unlockCondition: row[headers.indexOf("unlockCondition")] || '',
        createdBy: row[headers.indexOf("createdBy")] || '',
        createdAt: row[headers.indexOf("createdAt")] || '',
        updatedAt: row[headers.indexOf("updatedAt")] || '',
        contentDocId: row[headers.indexOf("contentDocId")] || '',
        contentDocUrl: row[headers.indexOf("contentDocUrl")] || ''
      });
    }

    // Sort by order
    topics.sort((a, b) => (a.order || 0) - (b.order || 0));

    return topics;
  } catch (error) {
    Logger.log("Error getting topics for admin: " + error.toString());
    return [];
  }
}

// ========================================
// LESSONS MANAGEMENT
// ========================================

/**
 * Lấy danh sách Lessons (MCQ) cho Admin
 */
function getAllLessonsForAdmin() {
  try {
    const sheet = getSheet("MCQ_Questions");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet MCQ_Questions" };
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
    return { success: true, message: "Đã xóa cache thành công!" };
  } catch (error) {
    Logger.log("Error clearing cache: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Lấy thông tin admin hiện tại dựa trên email đăng nhập
 */
function getCurrentAdminContext() {
  try {
    // Try to get email from Session (works for owner/editors)
    let email = "";
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {
      Logger.log("Session.getActiveUser() failed: " + e.toString());
    }

    // If no email from session, try effective user
    if (!email) {
      try {
        email = Session.getEffectiveUser().getEmail();
      } catch (e) {
        Logger.log("Session.getEffectiveUser() failed: " + e.toString());
      }
    }

    Logger.log("getCurrentAdminContext - email: " + email);

    if (!email) {
      // If still no email, allow if running as script owner (dev mode)
      Logger.log("⚠️ No email from Session, checking if script owner...");
      // For development, allow access - in production, you should handle this differently
      return {
        success: true,
        email: "admin@local",
        userId: "ADMIN_SCRIPT_OWNER",
        role: "ADMIN",
        note: "Running as script owner (no session email)"
      };
    }

    const sheet = getSheet("Users");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Users" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const roleIndex = headers.indexOf("role");
    const userIdIndex = headers.indexOf("userId");

    for (let i = 1; i < data.length; i++) {
      if (
        emailIndex !== -1 &&
        String(data[i][emailIndex]).toLowerCase() === email.toLowerCase()
      ) {
        const role = roleIndex !== -1 ? String(data[i][roleIndex]).toUpperCase() : "";
        if (role !== "ADMIN") {
          return { success: false, message: "Chỉ ADMIN mới được tạo/chỉnh sửa topic." };
        }

        return {
          success: true,
          email: email,
          userId: userIdIndex !== -1 ? data[i][userIdIndex] : "",
          role: role,
        };
      }
    }

    return {
      success: false,
      message: "Không tìm thấy tài khoản với email này hoặc không phải ADMIN.",
    };
  } catch (error) {
    Logger.log("Error getting admin context: " + error.toString());
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
 * Lấy HTML của Topic Editor
 */
function getTopicEditorHtml() {
  try {
    const template = HtmlService.createTemplateFromFile('views/admin/topicEditor/topic_editor');
    return template.evaluate().getContent();
  } catch (error) {
    Logger.log("Error getting topic editor HTML: " + error.toString());
    return "<p>Lỗi tải Topic Editor: " + error.toString() + "</p>";
  }
}

/**
 * Lấy HTML đầy đủ của Topic Editor (styles + content + scripts)
 */
function getTopicEditorFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/topicEditor/topic_editor_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/topicEditor/topic_editor').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/topicEditor/topic_editor_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting topic editor full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>Lỗi tải Topic Editor: " + error.toString() + "</p>";
  }
}

/**
 * Lấy HTML đầy đủ của Content Management (styles + content + scripts)
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
    return "<p style='color:#d93025;padding:20px;'>Lỗi tải Quản lý Nội dung: " + error.toString() + "</p>";
  }
}

/**
 * Lấy HTML đầy đủ của User Stats (styles + content + scripts)
 */
function getUserStatsFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/userStats/user_stats_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/userStats/user_stats_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/userStats/user_stats_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting user stats full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>Lỗi tải Thống kê người dùng: " + error.toString() + "</p>";
  }
}

/**
 * Lấy HTML đầy đủ của Course Stats (styles + content + scripts)
 */
function getCourseStatsFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/courseStats/course_stats_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/courseStats/course_stats_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/courseStats/course_stats_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting course stats full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>Lỗi tải Thống kê khóa học: " + error.toString() + "</p>";
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
      message: "Đã lưu danh sách Pet variants thành công",
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
      message: "Đã lưu danh mục PET thành công",
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
 * Lấy HTML đầy đủ của Pet Management (styles + content + scripts)
 */
function getPetManagementFullHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/petManagement/pet_management_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/petManagement/pet_management_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/petManagement/pet_management_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error getting pet management full HTML: " + error.toString());
    return "<p style='color:#d93025;padding:20px;'>Lỗi tải Quản lý PET: " + error.toString() + "</p>";
  }
}

/**
 * Include file HTML (styles, scripts)
 */
function includeTopicEditorFile(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Upload hình ảnh lên Google Drive
 * @param {string} base64Data - Dữ liệu hình ảnh dạng base64
 * @param {string} fileName - Tên file
 * @param {string} mimeType - Loại file (image/png, image/jpeg, etc.)
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
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get direct image URL - sử dụng format lh3.googleusercontent.com để embed tốt hơn
    const fileId = file.getId();
    // Format này hoạt động tốt hơn cho embedding trong HTML
    const imageUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    Logger.log("✅ Image uploaded successfully");
    Logger.log("File ID: " + fileId);
    Logger.log("Image URL: " + imageUrl);

    return {
      success: true,
      imageUrl: imageUrl,
      fileId: fileId,
      message: "Upload thành công!"
    };
  } catch (error) {
    Logger.log("❌ Error uploading image: " + error.toString());
    return {
      success: false,
      imageUrl: "",
      message: "Lỗi upload: " + error.toString()
    };
  }
}

/**
 * Tạo Google Doc và publish topic vào MasterDB
 * @param {object} topicData - Dữ liệu topic
 * @returns {object} - {success, docId, docUrl, message}
 */
function createAndPublishTopic(topicData) {
  try {
    Logger.log("=== CREATE AND PUBLISH TOPIC ===");
    Logger.log("Topic data received: " + JSON.stringify(topicData));

    // Quyền: chỉ ADMIN được phép
    Logger.log("Step 1: Checking admin context...");
    const adminContext = getCurrentAdminContext();
    Logger.log("Admin context result: " + JSON.stringify(adminContext));
    if (!adminContext.success) {
      return { success: false, message: adminContext.message };
    }

    // Validate input
    Logger.log("Step 2: Validating input...");
    if (!topicData.topicId || !topicData.title || !topicData.category || !topicData.content) {
      Logger.log("❌ Missing required fields");
      return {
        success: false,
        message: "Thiếu thông tin bắt buộc (topicId, title, category, content)"
      };
    }

    // Check if topicId already exists
    Logger.log("Step 3: Checking if topicId exists: " + topicData.topicId);
    const existingTopic = checkTopicIdExists(topicData.topicId);
    Logger.log("Topic exists: " + existingTopic);
    if (existingTopic) {
      return {
        success: false,
        message: "Topic ID '" + topicData.topicId + "' đã tồn tại. Vui lòng chọn ID khác."
      };
    }

    // Step 1: Create Google Doc with content
    Logger.log("Step 4: Creating Google Doc...");
    const docResult = createTopicDocument(topicData.title, topicData.content);
    Logger.log("Doc creation result: " + JSON.stringify(docResult));
    if (!docResult.success) {
      return docResult;
    }

    // Step 2: Save topic to MasterDB
    Logger.log("Step 5: Saving to MasterDB...");
    const saveResult = saveTopicToMasterDB({
      topicId: topicData.topicId,
      title: topicData.title,
      description: topicData.description || "",
      category: topicData.category,
      order: topicData.order || 999,
      contentDocId: docResult.docId,
      contentDocUrl: docResult.docUrl,
      createdBy: adminContext.userId || adminContext.email || "ADMIN",
    });
    Logger.log("Save result: " + JSON.stringify(saveResult));
    
    if (!saveResult.success) {
      // If save fails, try to delete the created doc
      try {
        DriveApp.getFileById(docResult.docId).setTrashed(true);
      } catch (e) {
        Logger.log("Could not trash doc after save failure: " + e.toString());
      }
      return saveResult;
    }
    
    // Clear server topics cache so new topic appears immediately
    try {
      clearTopicsCache();
    } catch (e) {
      Logger.log("⚠️ Could not clear topics cache: " + e.toString());
    }
    
    Logger.log("✅ Topic created and published successfully");
    
    return {
      success: true,
      docId: docResult.docId,
      docUrl: docResult.docUrl,
      topicId: topicData.topicId,
      message: "Topic đã được publish thành công!"
    };
  } catch (error) {
    Logger.log("❌ Error creating topic: " + error.toString());
    return {
      success: false,
      message: "Lỗi tạo topic: " + error.toString()
    };
  }
}

/**
 * Tạo Google Doc từ nội dung HTML
 * @param {string} title - Tiêu đề doc
 * @param {string} htmlContent - Nội dung HTML
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
      Logger.log("❌ Cannot access topics folder: " + folderErr.toString());
      return {
        success: false,
        docId: "",
        docUrl: "",
        message:
          "Không truy cập được folder lưu Docs. Kiểm tra quyền truy cập folder: " +
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
      Logger.log("⚠️ Could not remove file from root: " + e.toString());
    }
    
    // Set sharing - anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const docUrl = doc.getUrl();
    
    Logger.log("✅ Doc created successfully");
    Logger.log("Doc ID: " + docId);
    Logger.log("Doc URL: " + docUrl);
    
    return {
      success: true,
      docId: docId,
      docUrl: docUrl,
      message: "Tạo document thành công!"
    };
  } catch (error) {
    Logger.log("❌ Error creating document: " + error.toString());
    return {
      success: false,
      docId: "",
      docUrl: "",
      message: "Lỗi tạo document: " + error.toString()
    };
  }
}

/**
 * Chuyển đổi HTML content sang Google Doc format.
 * Handles both HTML elements AND text-based block markers ([[NOTE]], [[CODE:PYTHON]], etc.).
 *
 * Strategy:
 *   1. Normalize HTML entities and bracket markers.
 *   2. Extract block markers ([[TYPE]]...[[/TYPE]]) FIRST and split the HTML into
 *      an ordered list of segments: { kind:"html", value } and { kind:"marker", value }.
 *   3. For each HTML segment, use parseHtmlBlocks() to write structured content.
 *   4. For each marker segment, write it as a plain-text paragraph so it round-trips.
 *
 * @param {string} html - Nội dung HTML (with block markers as text)
 * @param {Body} body - Body của Google Doc
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
      body.appendParagraph("(Nội dung trống)");
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
      body.appendParagraph("(Không thể parse nội dung)");
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

      // seg.kind === "html" — process the HTML chunk with parseHtmlBlocks
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

          case 'pre':
            var codePara = body.appendParagraph(block.text || '');
            codePara.setFontFamily('Consolas');
            codePara.setBackgroundColor('#f1f3f4');
            break;

          case 'codeblock':
            var codeHeader = body.appendParagraph('📝 ' + (block.language || 'Code').toUpperCase());
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
                body.appendParagraph('[Hình ảnh: URL trống]');
                break;
              }
              if (imageCount >= MAX_IMAGES) {
                body.appendParagraph('[Hình ảnh: ' + block.src + '] (bỏ qua - đã đạt giới hạn)');
                break;
              }
              imageCount++;
              var imageBlob = getImageBlobFromSrc(block.src);
              if (imageBlob) {
                appendResizedImageToDoc(body, imageBlob);
              } else {
                body.appendParagraph('[Hình ảnh không tải được: ' + block.src + ']');
              }
            } catch (imgErr) {
              Logger.log("Image error: " + imgErr.toString() + " - URL: " + block.src);
              body.appendParagraph('[Hình ảnh: ' + block.src + ']');
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
    Logger.log("✅ HTML converted successfully");
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
      "⚠️ Detected missing [[/CODE]] markers: " +
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
      "⚠️ Repairing Doc CODE markers: append " +
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
    // "Hết" already exists – ensure it is centered (it may have lost alignment
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
 * Lấy blob ảnh từ src (data URL, Google Drive URL, Google Docs export URL, hoặc URL thường)
 * @param {string} src
 * @returns {Blob|null}
 */
function getImageBlobFromSrc(src) {
  var imageSrc = String(src || "").trim();
  if (!imageSrc) return null;

  // 1) Data URL (quan trọng cho edit mode vì ảnh cũ có thể đã được normalize thành base64)
  if (imageSrc.indexOf("data:") === 0) {
    var dataMatch = imageSrc.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/i);
    if (!dataMatch) return null;

    var mimeType = dataMatch[1] || "application/octet-stream";
    var meta = dataMatch[2] || "";
    var payload = String(dataMatch[3] || "");
    var isBase64 = /;base64/i.test(meta);

    try {
      if (isBase64) {
        // Dọn payload để decode ổn định (tránh xuống dòng/khoảng trắng, url-safe base64)
        payload = payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
        var bytes = Utilities.base64Decode(payload);
        return Utilities.newBlob(bytes, mimeType, "embedded_image");
      }
      var decodedText = decodeURIComponent(payload);
      return Utilities.newBlob(decodedText, mimeType, "embedded_image");
    } catch (dataError) {
      Logger.log("⚠️ Data URL decode failed: " + dataError.toString());
      return null;
    }
  }

  // 2) Google Drive URL -> lấy trực tiếp bằng DriveApp
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
        Logger.log("⚠️ Drive fetch failed: " + driveError.toString());
      }
      break;
    }
  }

  // 3) Fetch URL từ web, thử với OAuth trước cho googleusercontent/docsz
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
    Logger.log("⚠️ UrlFetch image failed: " + fetchError.toString());
  }

  return null;
}

/**
 * Thêm ảnh vào Google Doc và tự thu nhỏ theo giới hạn cấu hình, giữ tỉ lệ gốc.
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
    var scale = Math.min(widthRatio, heightRatio, 1); // Không phóng to ảnh nhỏ

    if (scale < 1) {
      image.setWidth(Math.round(originalWidth * scale));
      image.setHeight(Math.round(originalHeight * scale));
    }

    return image;
  } catch (error) {
    Logger.log("⚠️ appendResizedImageToDoc error: " + error.toString());
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
 * Parse HTML thành các block elements
 * @param {string} html - Nội dung HTML
 * @returns {Array} - Mảng các block objects
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
    const MAX_MATCHES = 200; // Giới hạn số lần match để tránh timeout

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
        // Tránh để <p> chứa ảnh/code/list bị parse thành text và làm rơi block con.
        if (/<img\b|<ul\b|<ol\b|<pre\b|<div\b|<h[1-6]\b|class=(["'])[^"']*\b(?:image-wrapper|code-block|callout)\b[^"']*\1/i.test(pInnerHtml)) {
          continue;
        }
        matchData.text = stripHtml(pInnerHtml);
      } else if (pattern.type === 'div') {
        const divInnerHtml = match[1] || "";
        // Tránh để generic div nuốt mất các block đặc thù (đặc biệt là ảnh).
        if (/<img\b|<ul\b|<ol\b|<pre\b|<h[1-6]\b|class=(["'])[^"']*\b(?:image-wrapper|code-block|callout)\b[^"']*\1/i.test(divInnerHtml)) {
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
 * Xóa HTML tags và giữ lại text
 */
function stripHtml(html) {
  if (!html) return '';
  return html
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
 * Decode HTML entities (dùng cho code blocks)
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

/**
 * Kiểm tra topicId đã tồn tại chưa
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

/**
 * Lưu topic vào MasterDB
 */
function saveTopicToMasterDB(topicData) {
  try {
    Logger.log("=== SAVE TOPIC TO MASTERDB ===");
    Logger.log("Topic data: " + JSON.stringify(topicData));
    
    const sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Topics" };
    }
    
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Ensure new column for doc URL exists
    if (headers.indexOf("contentDocUrl") === -1) {
      const newColIndex = headers.length + 1;
      sheet.getRange(1, newColIndex).setValue("contentDocUrl");
      headers = headers.concat(["contentDocUrl"]);
    }
    
    // Prepare row data based on schema
    const rowData = [];
    const now = new Date().toISOString();
    
    for (const header of headers) {
      switch (header) {
        case 'topicId':
          rowData.push(topicData.topicId);
          break;
        case 'title':
          rowData.push(topicData.title);
          break;
        case 'description':
          rowData.push(topicData.description || '');
          break;
        case 'category':
          rowData.push(topicData.category);
          break;
        case 'iconUrl':
          rowData.push(topicData.iconUrl || '');
          break;
        case 'estimatedTime':
          rowData.push(topicData.estimatedTime || '');
          break;
        case 'prerequisiteTopics':
          rowData.push(topicData.prerequisiteTopics || '');
          break;
        case 'unlockCondition':
          rowData.push(topicData.unlockCondition || '');
          break;
        case 'order':
          rowData.push(topicData.order || 999);
          break;
        case 'contentDocId':
          rowData.push(topicData.contentDocId);
          break;
        case 'contentDocUrl':
          rowData.push(topicData.contentDocUrl || '');
          break;
        case 'createdBy':
          rowData.push(topicData.createdBy || 'ADMIN');
          break;
        case 'createdAt':
          rowData.push(now);
          break;
        case 'updatedAt':
          rowData.push(now);
          break;
        case 'isLocked':
          rowData.push(
            typeof topicData.isLocked === "boolean" ? topicData.isLocked : false,
          );
          break;
        default:
          rowData.push('');
      }
    }
    
    // Append new row
    sheet.appendRow(rowData);
    
    Logger.log("✅ Topic saved to MasterDB successfully");
    
    return {
      success: true,
      message: "Đã lưu topic vào MasterDB"
    };
  } catch (error) {
    Logger.log("❌ Error saving topic: " + error.toString());
    return {
      success: false,
      message: "Lỗi lưu topic: " + error.toString()
    };
  }
}

/**
 * Xóa topic và document Google Doc liên quan
 * @param {string} topicId - ID của topic cần xóa
 * @returns {Object} Kết quả xóa
 */
function deleteTopicWithDoc(topicId) {
  try {
    Logger.log("=== DELETE TOPIC WITH DOC ===");
    Logger.log("Topic ID: " + topicId);

    // Kiểm tra quyền admin
    const adminContext = getCurrentAdminContext();
    if (!adminContext.success) {
      return { success: false, message: adminContext.message || "Không có quyền admin" };
    }

    // Lấy sheet Topics
    const sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Topics" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdIndex = headers.indexOf("topicId");
    const contentDocIdIndex = headers.indexOf("contentDocId");
    const titleIndex = headers.indexOf("title");

    if (topicIdIndex === -1) {
      return { success: false, message: "Không tìm thấy cột topicId trong sheet" };
    }

    // Tìm row chứa topic
    let rowIndex = -1;
    let contentDocId = null;
    let topicTitle = "";

    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdIndex] === topicId) {
        rowIndex = i + 1; // +1 vì sheet row bắt đầu từ 1, không phải 0
        if (contentDocIdIndex !== -1) {
          contentDocId = data[i][contentDocIdIndex];
        }
        if (titleIndex !== -1) {
          topicTitle = data[i][titleIndex];
        }
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "Không tìm thấy topic với ID: " + topicId };
    }

    Logger.log("Found topic at row: " + rowIndex);
    Logger.log("Topic title: " + topicTitle);
    Logger.log("Content Doc ID: " + contentDocId);

    // Xóa Google Doc nếu có
    let docDeleted = false;
    if (contentDocId) {
      try {
        const file = DriveApp.getFileById(contentDocId);
        file.setTrashed(true);
        docDeleted = true;
        Logger.log("✅ Document moved to trash: " + contentDocId);
      } catch (docError) {
        Logger.log("⚠️ Could not delete document: " + docError.toString());
        // Vẫn tiếp tục xóa topic trong sheet
      }
    }

    // Xóa row trong sheet
    sheet.deleteRow(rowIndex);
    Logger.log("✅ Topic row deleted from sheet");

    // Xóa cache
    try {
      clearTopicsCache();
    } catch (cacheError) {
      Logger.log("⚠️ Could not clear cache: " + cacheError.toString());
    }

    return {
      success: true,
      message: "Đã xóa bài học " + (topicTitle ? '"' + topicTitle + '"' : topicId) + " thành công!",
      docDeleted: docDeleted
    };

  } catch (error) {
    Logger.log("❌ Error deleting topic: " + error.toString());
    return { success: false, message: "Lỗi khi xóa topic: " + error.toString() };
  }
}

/**
 * Lấy danh sách categories từ Topics hiện có
 * Trả về mảng categories trực tiếp
 */
function getTopicCategories() {
  try {
    const sheet = getSheet("Topics");
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const categoryIndex = headers.indexOf("category");

    if (categoryIndex === -1) return [];

    const categories = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryIndex]) {
        categories.add(data[i][categoryIndex]);
      }
    }

    return Array.from(categories).sort();
  } catch (error) {
    Logger.log("Error getting categories: " + error.toString());
    return [];
  }
}

// ========================================
// EDIT TOPIC - Load & Update
// ========================================

/**
 * Lấy thông tin topic + nội dung doc HTML để edit
 * @param {string} topicId - ID của topic cần edit
 * @returns {object} { success, data: { topic, content } }
 */
function getTopicForEdit(topicId) {
  try {
    Logger.log("=== GET TOPIC FOR EDIT ===");
    Logger.log("Topic ID: " + topicId);

    // Kiểm tra quyền admin
    const adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message: (adminContext && adminContext.message) || "Không thể xác thực quyền admin"
      };
    }

    // Validate
    if (!topicId) {
      return { success: false, message: "Thiếu Topic ID" };
    }

    // Lấy topic metadata từ sheet
    const sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Topics" };
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
      return { success: false, message: "Không tìm thấy topic: " + topicId };
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
      contentDocId: topicRow[headers.indexOf("contentDocId")] || "",
      contentDocUrl: topicRow[headers.indexOf("contentDocUrl")] || "",
      isLocked: topicRow[headers.indexOf("isLocked")] === true || topicRow[headers.indexOf("isLocked")] === "TRUE"
    };

    // Lấy nội dung doc HTML
    var content = "";
    if (topic.contentDocId) {
      var docResult = getTopicContentByDocId(topic.contentDocId);
      if (docResult && docResult.success && docResult.content) {
        content = normalizeDocImagesForTopicEditor(docResult.content);
      }
    }

    Logger.log("✅ Topic loaded for edit: " + topic.title);
    Logger.log("Content length: " + content.length);

    return {
      success: true,
      data: {
        topic: topic,
        content: content
      }
    };
  } catch (error) {
    Logger.log("❌ Error getting topic for edit: " + error.toString());
    return {
      success: false,
      message: "Lỗi khi tải topic: " + error.toString()
    };
  }
}

/**
 * Chuẩn hóa ảnh từ Google Doc export để hiển thị ổn định trong Topic Editor.
 * Google Doc thường trả URL dạng docsz/googleusercontent tạm thời, có thể không render được ở client.
 * Hàm này đổi các ảnh đó sang data URL để khi mở màn hình edit vẫn thấy ảnh.
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

    // Chỉ xử lý nhóm URL ảnh export từ Google Docs.
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
          "⚠️ normalizeDocImagesForTopicEditor: cannot fetch image (" +
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
        "⚠️ normalizeDocImagesForTopicEditor error: " + imageError.toString(),
      );
      return fullMatch;
    }
  });

  return normalized;
}

/**
 * Cập nhật topic: metadata in MasterDB + nội dung Google Doc
 * @param {string} topicId - ID topic cần cập nhật
 * @param {object} topicData - { title, description, category, order, content }
 * @returns {object} { success, message }
 */
function updateTopicWithContent(topicId, topicData) {
  try {
    Logger.log("=== UPDATE TOPIC WITH CONTENT ===");
    Logger.log("Topic ID: " + topicId);

    // Kiểm tra quyền admin
    var adminContext = getCurrentAdminContext();
    if (!adminContext || !adminContext.success) {
      return {
        success: false,
        message: (adminContext && adminContext.message) || "Không thể xác thực quyền admin"
      };
    }

    // Validate
    if (!topicId) {
      return { success: false, message: "Thiếu Topic ID" };
    }
    if (!topicData) {
      return { success: false, message: "Không có dữ liệu cập nhật" };
    }

    // Tìm topic trong sheet
    var sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Topics" };
    }

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

    if (topicRowIndex === -1) {
      return { success: false, message: "Không tìm thấy topic: " + topicId };
    }

    var hasContentInPayload = Object.prototype.hasOwnProperty.call(topicData, "content");
    if (hasContentInPayload && !contentDocId) {
      return {
        success: false,
        message: "Topic chưa có Google Doc để cập nhật nội dung. Vui lòng tạo lại topic có liên kết Doc."
      };
    }

    // 1. Cập nhật metadata trong sheet Topics
    var now = new Date().toISOString();
    var titleCol = headers.indexOf("title");
    var descCol = headers.indexOf("description");
    var categoryCol = headers.indexOf("category");
    var orderCol = headers.indexOf("order");
    var updatedAtCol = headers.indexOf("updatedAt");
    var contentDocIdCol = headers.indexOf("contentDocId");
    var contentDocUrlCol = headers.indexOf("contentDocUrl");

    var rowNum = topicRowIndex + 1; // 1-indexed for sheet

    if (titleCol >= 0 && topicData.title) {
      sheet.getRange(rowNum, titleCol + 1).setValue(topicData.title);
    }
    if (descCol >= 0 && topicData.description !== undefined) {
      sheet.getRange(rowNum, descCol + 1).setValue(topicData.description || "");
    }
    if (categoryCol >= 0 && topicData.category) {
      sheet.getRange(rowNum, categoryCol + 1).setValue(topicData.category);
    }
    if (orderCol >= 0 && topicData.order !== undefined) {
      sheet.getRange(rowNum, orderCol + 1).setValue(parseInt(topicData.order) || 999);
    }
    if (updatedAtCol >= 0) {
      sheet.getRange(rowNum, updatedAtCol + 1).setValue(now);
    }

    Logger.log("✅ Metadata updated in MasterDB");

    // 2. Cập nhật nội dung Google Doc
    var docOperation = "none";
    if (contentDocId && hasContentInPayload) {
      try {
        var doc = DocumentApp.openById(contentDocId);
        var body = doc.getBody();

        // Xóa toàn bộ nội dung cũ trước khi đẩy nội dung mới
        body.clear();
        convertHtmlToDocContent(topicData.content || "", body);

        doc.saveAndClose();
        Logger.log("✅ Google Doc updated: " + contentDocId);
        docOperation = "updated";
      } catch (docError) {
        Logger.log("❌ Error updating Doc: " + docError.toString());
        return {
          success: false,
          message: "Đã cập nhật metadata nhưng lỗi khi cập nhật Doc: " + docError.toString()
        };
      }
    }

    // Clear cache để data mới hiện ngay
    try {
      clearTopicsCache();
    } catch (e) {
      Logger.log("⚠️ Could not clear topics cache: " + e.toString());
    }

    Logger.log("✅ Topic updated successfully");

    return {
      success: true,
      message: "Đã cập nhật bài học thành công!",
      docOperation: docOperation,
      contentDocId: contentDocId,
      contentDocUrl: contentDocUrl
    };
  } catch (error) {
    Logger.log("❌ Error updating topic: " + error.toString());
    return {
      success: false,
      message: "Lỗi khi cập nhật topic: " + error.toString()
    };
  }
}
