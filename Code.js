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
  return resetPasswordWithCodeInternal(data);
}

// ⭐ Wrapper cho frontend gọi resetPasswordWithCode
function resetPasswordWithCode(data) {
  return resetPasswordWithCodeInternal(data);
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

function getPetAssetUrls() {
  const PET_ASSET_FOLDER_ID = "12jqWFzHKYywN8eTT_Y9F8lFeOs9gjI-I";
  const IMAGE_FILE_PATTERN = /\.(svg|png|jpg|jpeg|webp|gif)$/i;
  const STAGE_FILE_PATTERN = /^(N[eề]n|Nen|stage_bg_)\s*_?(\d{1,2})\.png$/i;
  const CACHE_KEY = "PET_ASSET_URLS_CACHE_V1";
  const CACHE_TTL_SECONDS = 6 * 60 * 60;

  try {
    const cache = CacheService.getScriptCache();
    const cachedRaw = cache.get(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached && cached.success && cached.urls) {
        return cached;
      }
    }

    const folder = DriveApp.getFolderById(PET_ASSET_FOLDER_ID);
    const urls = {};
    const queue = [folder];

    while (queue.length > 0) {
      const currentFolder = queue.shift();
      if (!currentFolder) continue;

      const subFolders = currentFolder.getFolders();
      while (subFolders.hasNext()) {
        queue.push(subFolders.next());
      }

      const files = currentFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fileName = String(file.getName() || "").trim();
        if (!IMAGE_FILE_PATTERN.test(fileName)) continue;

        const fileId = file.getId();
        const candidateUrls = [
          "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w2000",
          "https://drive.google.com/uc?export=view&id=" + fileId,
          "https://drive.google.com/uc?export=download&id=" + fileId,
          "https://lh3.googleusercontent.com/d/" + fileId + "=w2000",
        ];

        // Try to make file public, but do not fail the whole response if restricted.
        try {
          const sharingAccess = file.getSharingAccess();
          if (
            sharingAccess !== DriveApp.Access.ANYONE &&
            sharingAccess !== DriveApp.Access.ANYONE_WITH_LINK
          ) {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
        } catch (sharingError) {
          Logger.log("Skipping setSharing for " + fileName + ": " + sharingError);
        }

        urls[fileName] = candidateUrls;

        const stageMatch = fileName.match(STAGE_FILE_PATTERN);
        if (stageMatch) {
          const stageIndex = Number(stageMatch[2]);
          if (stageIndex >= 1 && stageIndex <= 4) {
            urls["Nền " + stageIndex + ".png"] = candidateUrls;
            urls["Nen " + stageIndex + ".png"] = candidateUrls;
            urls["stage_bg_" + stageIndex + ".png"] = candidateUrls;
          }
        }
      }
    }

    if (!Object.keys(urls).length) {
      return {
        success: false,
        message: "Không tìm thấy ảnh PET trong Drive folder.",
      };
    }

    const payload = {
      success: true,
      urls: urls,
    };

    try {
      cache.put(CACHE_KEY, JSON.stringify(payload), CACHE_TTL_SECONDS);
    } catch (cacheError) {
      Logger.log("Cache put failed for getPetAssetUrls: " + cacheError);
    }

    return payload;
  } catch (error) {
    return {
      success: false,
      message: "Lỗi lấy ảnh PET từ Google Drive: " + (error && error.message ? error.message : error),
    };
  }
}

// ⭐ Wrapper for clearing all learning data - forwards to content.js function
// Note: The actual clearAllLearningData function is in server/content.js
// This just ensures it's properly exposed to the frontend via google.script.run

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
