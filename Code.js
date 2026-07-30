/**
 * Code.js - Main Entry Point
 *
 * Clean & organized structure - All functions imported from modules
 *
 * Module Structure:
 * - config/schemas.js: DB_CONFIG, USER_DB_CONFIG
 * - utils/security.js: hashPassword, verifyPassword, isValidEmail, generateVerificationToken
 * - utils/helpers.js: generateNextId, formatDate, logActivity
 * - database/masterDb.js: getOrCreateDatabase, createAllSheets, getSheet
 * - database/userDb.js: createUserPersonalSheet, findUserProgressSheet, getUserSpreadsheet
 * - auth/register.js: registerWithEmail, verifyEmail, resendVerificationEmail
 * - auth/login.js: loginWithEmail, getUserSession
 * - auth/passwordReset.js: requestPasswordReset, resetPasswordWithCode
 * - auth/emailService.js: sendVerificationEmail, sendPasswordResetCodeEmail
 * - server/topics.js: getAllTopics, getUserTopicProgress, updateUserTopicProgress
 */ // ========================================
// WEB APP ENTRY POINT
// ========================================

/**
 * Handle GET requests - Serve the web application with routing support
 */
function doGet(e) {
  try {
    Logger.log("=== doGet called ===");
    Logger.log("Parameters: " + JSON.stringify(e.parameter));

    // --- PHẦN THÊM MỚI: Xử lý Callback Google Login ---
    if (e.parameter.code && e.parameter.state === "google_login_flow") {
      return handleGoogleCallback(e.parameter.code);
    }

    // --- PHẦN THÊM MỚI: Phục vụ Service Worker ---
    if (e.parameter.path === "sw.js") {
      return ContentService.createTextOutput(include("views/Pet/sw_js"))
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    // --------------------------------------------------

    const template = HtmlService.createTemplateFromFile("views/index");

    // ⭐ SERVER-SIDE ROUTING: Truyền tham số 'page' vào template
    const requestedPage = e.parameter.page || "";
    template.page = requestedPage;
    template.params = e.parameter || {};

    Logger.log("Requested page: " + requestedPage);

    const htmlOutput = template
      .evaluate()
      .setTitle("Doanv3 - Learning Management System")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1");

    return htmlOutput;
  } catch (error) {
    Logger.log("Error in doGet: " + error.toString());
    return HtmlService.createHtmlOutput(
      "<h1>Error loading application</h1><p>" + error.toString() + "</p>",
    );
  }
}

/**
 * Include helper function to embed HTML files
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log("Error including file " + filename + ": " + error.toString());
    return "<!-- Error loading " + filename + " -->";
  }
}

// ========================================
// WRAPPER FUNCTIONS FOR BACKWARD COMPATIBILITY
// ========================================

function registerWithEmailPassword(userData) {
  return registerWithEmail(userData);
}

function registerUser(userData) {
  // Backward-compatible wrapper for legacy frontend calls.
  const payload = Object.assign({}, userData || {});

  if (!payload.confirmPassword && payload.password) {
    payload.confirmPassword = payload.password;
  }

  const result = registerWithEmail(payload);

  // Keep both formats to avoid breaking old/new UIs.
  if (result && typeof result.success !== "undefined") {
    result.status = result.success ? "success" : "error";
  }

  return result;
}

function verifyEmailToken(token) {
  return verifyEmail(token);
}

function loginWithEmailPassword(credentials) {
  return loginWithEmail(credentials);
}

function terracodeLoginV2(payload) {
  // Wrapper function for frontend compatibility
  const result = loginWithEmail({
    // Support both legacy username field and current email field.
    email: payload && (payload.email || payload.username),
    password: payload && payload.password,
    force: payload && payload.force === true,
  });

  // Giữ lại requireConfirmation để client xử lý confirm
  if (result && result.requireConfirmation) {
    return {
      success: false,
      status: "confirm",
      requireConfirmation: true,
      message: result.message,
    };
  }

  // Return both modern and legacy response fields.
  if (result && result.success) {
    return {
      success: true,
      status: "success",
      message: result.message,
      user: result.user,
    };
  } else {
    return {
      success: false,
      status: "error",
      message: result ? result.message : "Đăng nhập thất bại",
    };
  }
}

function checkUserSession(userId, sessionId) {
  return checkSession(userId, sessionId);
}

function clearUserSession(userId, sessionId) {
  return clearSessionDb(userId, sessionId);
}

function requestResetPassword(email) {
  return requestPasswordReset(email);
}

function confirmGoogleLogin(token) {
  return confirmGoogleLoginInternal(token);
}

function resetPasswordWithToken(data) {
  return resetPasswordWithCodeInternal(data);
}

// ⭐ Wrapper cho frontend gọi resetPasswordWithCode
function resetPasswordWithCode(data) {
  return resetPasswordWithCodeInternal(data);
}

function resendVerificationEmailToUser(email) {
  return resendVerificationEmail(email);
}

function resendVerificationCode(payload) {
  // Backward-compatible wrapper: accepts either string email or { email } object.
  const email =
    payload && typeof payload === "object" ? payload.email : payload;
  return resendVerificationEmail(email);
}

function verifyEmailCode(verificationData) {
  return verifyEmailWithCode(verificationData);
}

// ========================================
// PROFILE MANAGEMENT WRAPPERS
// ========================================

function updateProfile(profileData) {
  return updateUserProfile(profileData);
}

function changePassword(passwordData) {
  return changeUserPassword(passwordData);
}

// ⭐ Thêm wrapper mới
function saveAvatarUrl(userId, avatarUrl) {
  return saveUserAvatarUrl(userId, avatarUrl);
}

function getPetName(userId) {
  return getUserPetName(userId);
}

function savePetName(payload) {
  return saveUserPetName(payload);
}

function getPetConfig(userId) {
  return getUserPetConfig(userId);
}

function savePetConfig(userId, config) {
  return saveUserPetConfig(userId, config);
}

function purchasePetVariant(payload) {
  return purchaseUserPetVariant(payload);
}

function updateUserXQP(userEmail, amount, source) {
  return updateUserPoints(userEmail, amount, source);
}

// getPetAssetUrls removed as per PET refactor plan (using CDN + Manifest)

// ⭐ Wrapper for clearing all learning data - forwards to content.js function
// Note: The actual clearAllLearningData function is in server/content.js
// This just ensures it's properly exposed to the frontend via google.script.run

// ========================================
// CHAT & FRIENDS - REMOVED (Coming Soon)
// ========================================

// ========================================
// CONTENT MANAGEMENT WRAPPERS
// ========================================

function getTopicContent(docId) {
  return getTopicContentByDocId(docId);
}

function getDocumentMetadata(docId) {
  return getDocMetadata(docId);
}

// ========================================
// TIMELINE & SMART REMINDERS WRAPPERS
// ========================================

function apiGetStudySettings(payload) {
  return getStudySettings(payload);
}

function apiUpdateStudySettings(payload, settings) {
  try {
    payload = payload || {};

    // Hỗ trợ cả kiểu mới:
    // apiUpdateStudySettings({ userId, email, settings })
    if (!settings && payload.settings) {
      settings = payload.settings;
    }

    // Hỗ trợ cả kiểu cũ:
    // apiUpdateStudySettings({ userId, email }, settings)
    if (!settings || typeof settings !== "object") {
      return {
        success: false,
        message: "Thiếu dữ liệu settings gửi lên server"
      };
    }

    return updateStudySettings(
      {
        userId: payload.userId || "",
        email: payload.email || ""
      },
      settings
    );
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  }
}

function apiGenerateTimeline(payload) {
  return generateTimeline(payload);
}

function apiGetDailyQuests(payload) {
  return getDailyQuests(payload);
}

function apiRecoverStreak(payload) {
  return recoverStreak(payload);
}

// ========================================
// TEST FUNCTIONS
// ========================================

function testGetTopicContent() {
  // ⭐ THAY ĐỔI ID NÀY BẰNG ID THẬT CỦA BẠN
  const testDocId = "1D9U4sFVkXt0k_Mk-1qJZ1AoECUhHvURx1xYZSnqpgNM";

  Logger.log("Testing getTopicContentByDocId...");
  const result = getTopicContentByDocId(testDocId);

  Logger.log(
    "Result: " +
      JSON.stringify({
        success: result.success,
        message: result.message,
        contentLength: result.content ? result.content.length : 0,
      }),
  );

  return result;
}

function testGetAllTopics() {
  const result = getAllTopics();
  Logger.log("Topics test result: " + JSON.stringify(result));
  return result;
}

function testUpdateStudySettings_ID04() {
  try {
    const res = apiUpdateStudySettings({
      userId: "",
      email: "EMAIL_CUA_USER_ID04", // Thay bằng email thật để test nếu cần
      settings: {
        dailyGoal: 5,
        emailReminderEnabled: true,
        reminderTimes: ["20:00"],
        reminderMode: 1
      }
    });
    
    // Đọc thêm chi tiết
    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    
    throw new Error(JSON.stringify({
      updateResult: res,
      headers: headers,
      row5: usersSheet.getRange(5, 1, 1, headers.length).getValues()[0]
    }, null, 2));
  } catch (err) {
    throw new Error(err.message || String(err));
  }
}

function testInspectStudySettings() {
  const masterDbId = DB_CONFIG.SPREADSHEET_ID;
  const ss = SpreadsheetApp.openById(masterDbId);
  const usersSheet = ss.getSheetByName("Users");
  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];
  
  const colsNeeded = ["dailyGoal", "emailReminderEnabled", "reminderTimes", "reminderMode"];
  let headerChanged = false;
  colsNeeded.forEach(col => {
    colIndexes[col] = headers.indexOf(col);
  });
  
  const row5 = usersSheet.getRange(5, 1, 1, headers.length).getValues()[0];
  
  throw new Error(JSON.stringify({
    headers: headers,
    colIndexes: colIndexes,
    row5: row5,
    row5Length: row5.length,
    headersLength: headers.length
  }, null, 2));
}
// trigger push
