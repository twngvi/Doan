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
