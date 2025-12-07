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
 * Handle GET requests - Serve the web application
 */
function doGet(e) {
  try {
    Logger.log("=== doGet called ===");
    Logger.log("Parameters: " + JSON.stringify(e.parameter));

    const template = HtmlService.createTemplateFromFile("views/index");
    template.params = e.parameter || {};

    const htmlOutput = template
      .evaluate()
      .setTitle("Doanv3 - Learning Management System")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1");

    return htmlOutput;
  } catch (error) {
    Logger.log("Error in doGet: " + error.toString());
    return HtmlService.createHtmlOutput(
      "<h1>Error loading application</h1><p>" + error.toString() + "</p>"
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

function verifyEmailToken(token) {
  return verifyEmail(token);
}

function loginWithEmailPassword(credentials) {
  return loginWithEmail(credentials);
}

function loginUser(payload) {
  // Wrapper function for frontend compatibility
  const result = loginWithEmail({
    email: payload.username, // frontend sends 'username' but backend expects 'email'
    password: payload.password,
  });

  // Convert response format to match frontend expectations
  if (result.success) {
    return {
      status: "success",
      message: result.message,
      user: result.user,
    };
  } else {
    return {
      status: "error",
      message: result.message,
    };
  }
}

function requestResetPassword(email) {
  return requestPasswordReset(email);
}

function resetPasswordWithToken(data) {
  return resetPasswordWithCode(data);
}

function resendVerificationEmailToUser(email) {
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

function uploadAvatar(avatarData) {
  return uploadUserAvatar(avatarData);
}

// ========================================
// TEST FUNCTIONS
// ========================================

function testVerifyEmail() {
  const token = "test-token-here";
  const result = verifyEmail(token);
  Logger.log("Test result: " + JSON.stringify(result));
  return result;
}

function testSendEmail() {
  const email = "test@example.com";
  const token = "test123";
  const result = sendVerificationEmail(email, token, "Test User");
  Logger.log("Email sent: " + result);
  return result;
}
