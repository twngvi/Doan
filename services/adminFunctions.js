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
 * Lấy danh sách Topics cho Admin
 */
function getAllTopicsForAdmin() {
  try {
    const sheet = getSheet("Topics");
    if (!sheet) {
      return { success: false, message: "Không tìm thấy sheet Topics" };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    const headers = data[0];
    const topics = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      topics.push({
        topicId: row[headers.indexOf("topicId")],
        name: row[headers.indexOf("title")],
        description: row[headers.indexOf("description")],
        category: row[headers.indexOf("category")],
        orderIndex: row[headers.indexOf("order")] || i,
        contentDocId: row[headers.indexOf("contentDocId")],
        lessonsCount: 0 // TODO: Count lessons
      });
    }
    
    return { success: true, data: topics };
  } catch (error) {
    Logger.log("Error getting topics: " + error.toString());
    return { success: false, message: error.toString() };
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
  IMAGES_FOLDER_ID: "1nrcuio2Da7Zc3bij2HO4b7P8a-_053LN"
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
    const folder = DriveApp.getFolderById(TOPIC_EDITOR_CONFIG.IMAGES_FOLDER_ID);
    
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
    
    // Get direct image URL
    const fileId = file.getId();
    const imageUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
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
 * Chuyển đổi HTML content sang Google Doc format
 * @param {string} html - Nội dung HTML
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
      return true;
    }

    // Process the HTML content
    let content = html;

    // Replace common HTML entities
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');

    // Process block elements
    const blocks = parseHtmlBlocks(content);

    Logger.log("Parsed blocks count: " + blocks.length);

    // If no blocks found, try to extract plain text
    if (blocks.length === 0) {
      Logger.log("No blocks found, extracting plain text...");

      // Try to handle div-based content (common from contenteditable)
      const divContent = extractDivContent(content);
      if (divContent.length > 0) {
        Logger.log("Found " + divContent.length + " div blocks");
        for (let i = 0; i < divContent.length; i++) {
          if (divContent[i].trim()) {
            body.appendParagraph(divContent[i].trim());
          }
        }
        return true;
      }

      // Fallback: strip all tags and add as plain text
      const plainText = stripHtml(content);
      if (plainText.trim()) {
        // Split by line breaks
        const lines = plainText.split(/\n+/);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim()) {
            body.appendParagraph(lines[i].trim());
          }
        }
      } else {
        body.appendParagraph("(Không thể parse nội dung)");
      }
      return true;
    }

    // Process found blocks
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      Logger.log("Processing block " + i + ": type=" + block.type + ", text=" + (block.text ? block.text.substring(0, 50) : "N/A"));

      switch (block.type) {
        case 'h1':
          const h1 = body.appendParagraph(block.text || '');
          h1.setHeading(DocumentApp.ParagraphHeading.HEADING1);
          break;

        case 'h2':
          const h2 = body.appendParagraph(block.text || '');
          h2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
          break;

        case 'h3':
          const h3 = body.appendParagraph(block.text || '');
          h3.setHeading(DocumentApp.ParagraphHeading.HEADING3);
          break;

        case 'p':
        case 'div':
          if (block.text && block.text.trim()) {
            body.appendParagraph(block.text);
          }
          break;

        case 'ul':
          if (block.items && block.items.length > 0) {
            for (let j = 0; j < block.items.length; j++) {
              const li = body.appendListItem(block.items[j]);
              li.setGlyphType(DocumentApp.GlyphType.BULLET);
            }
          }
          break;

        case 'ol':
          if (block.items && block.items.length > 0) {
            for (let j = 0; j < block.items.length; j++) {
              const li = body.appendListItem(block.items[j]);
              li.setGlyphType(DocumentApp.GlyphType.NUMBER);
            }
          }
          break;

        case 'pre':
          const code = body.appendParagraph(block.text || '');
          code.setFontFamily('Consolas');
          code.setBackgroundColor('#f1f3f4');
          break;

        case 'codeblock':
          // Code block with language header
          const codeHeader = body.appendParagraph('📝 ' + (block.language || 'Code').toUpperCase());
          codeHeader.setFontFamily('Arial');
          codeHeader.setForegroundColor('#666666');
          codeHeader.setFontSize(10);

          const codeContent = body.appendParagraph(block.text || '');
          codeContent.setFontFamily('Consolas');
          codeContent.setBackgroundColor('#f1f3f4');
          codeContent.setFontSize(11);
          break;

        case 'callout':
          const callout = body.appendParagraph((block.icon || '') + ' ' + (block.text || ''));
          // Style based on callout type
          if (block.calloutType === 'note') {
            callout.setBackgroundColor('#e8f5e9');
          } else if (block.calloutType === 'warning') {
            callout.setBackgroundColor('#fff3e0');
          } else if (block.calloutType === 'info') {
            callout.setBackgroundColor('#e3f2fd');
          } else if (block.calloutType === 'danger') {
            callout.setBackgroundColor('#ffebee');
          }
          break;

        case 'image':
          try {
            // Skip if empty src
            if (!block.src || block.src.trim() === '') {
              body.appendParagraph('[Hình ảnh: URL trống]');
              break;
            }
            // Fetch with timeout and error handling
            const imageResponse = UrlFetchApp.fetch(block.src, {
              muteHttpExceptions: true,
              followRedirects: true,
              validateHttpsCertificates: false
            });

            if (imageResponse.getResponseCode() === 200) {
              const imageBlob = imageResponse.getBlob();
              body.appendImage(imageBlob);
            } else {
              Logger.log("Image fetch failed: " + block.src + " - Status: " + imageResponse.getResponseCode());
              body.appendParagraph('[Hình ảnh không tải được: ' + block.src + ']');
            }
          } catch (e) {
            Logger.log("Image error: " + e.toString() + " - URL: " + block.src);
            body.appendParagraph('[Hình ảnh: ' + block.src + ']');
          }
          break;

        default:
          if (block.text && block.text.trim()) {
            body.appendParagraph(block.text);
          }
      }
    }

    Logger.log("✅ HTML converted successfully");
    return true;
  } catch (error) {
    Logger.log("Error converting HTML to Doc: " + error.toString());
    // Fallback: just add plain text
    body.appendParagraph(html.replace(/<[^>]*>/g, ''));
    return false;
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
    { regex: /<div class="image-wrapper"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, type: 'image' },
    { regex: /<img[^>]*src="([^"]*)"[^>]*>/gi, type: 'image' },
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
    
    while ((match = regex.exec(html)) !== null) {
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
        matchData.src = match[1];
      } else {
        matchData.text = stripHtml(match[1] || '');
      }
      
      allMatches.push(matchData);
    }
  }

  // Sort by position
  allMatches.sort((a, b) => a.index - b.index);

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
 * Lấy danh sách categories từ Topics hiện có
 */
function getTopicCategories() {
  try {
    const sheet = getSheet("Topics");
    if (!sheet) return { success: false, categories: [] };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const categoryIndex = headers.indexOf("category");
    
    if (categoryIndex === -1) return { success: false, categories: [] };
    
    const categories = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryIndex]) {
        categories.add(data[i][categoryIndex]);
      }
    }
    
    return {
      success: true,
      categories: Array.from(categories).sort()
    };
  } catch (error) {
    Logger.log("Error getting categories: " + error.toString());
    return { success: false, categories: [] };
  }
}
