/**
 * profile.js - User Profile Management Functions
 *
 * Chứa các hàm cập nhật profile, đổi mật khẩu, upload avatar
 */

/**
 * Update user profile (displayName)
 */
function updateUserProfile(profileData) {
  try {
    Logger.log("=== UPDATE USER PROFILE ===");
    Logger.log("User ID: " + profileData.userId);

    if (!profileData.userId) {
      return {
        success: false,
        message: "User ID is required",
      };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống",
      };
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === profileData.userId) {
        // Update displayName (column 3)
        if (profileData.displayName !== undefined) {
          usersSheet.getRange(i + 1, 4).setValue(profileData.displayName);
        }

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: profileData.userId,
          action: "UPDATE_PROFILE",
          details: "Updated profile information",
        });

        Logger.log("Profile updated successfully");

        // Return updated user data
        const avatarUrl = data[i][6] || getGravatarUrl(data[i][2]);

        return {
          success: true,
          message: "Cập nhật hồ sơ thành công!",
          user: {
            userId: data[i][0],
            username: data[i][4],
            email: data[i][2],
            displayName: profileData.displayName || data[i][3] || data[i][4],
            avatarUrl: avatarUrl,
            role: data[i][7],
            level: data[i][8],
            totalXP: data[i][11],
            totalXQP: data[i][12],
            progressSheetId: data[i][25],
          },
        };
      }
    }

    return {
      success: false,
      message: "Không tìm thấy người dùng",
    };
  } catch (error) {
    Logger.log("Error in updateUserProfile: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Change user password
 */
function changeUserPassword(passwordData) {
  try {
    Logger.log("=== CHANGE USER PASSWORD ===");
    Logger.log("User ID: " + passwordData.userId);

    if (
      !passwordData.userId ||
      !passwordData.currentPassword ||
      !passwordData.newPassword
    ) {
      return {
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      };
    }

    if (passwordData.newPassword.length < 6) {
      return {
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống",
      };
    }

    const data = usersSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === passwordData.userId) {
        const currentPasswordHash = data[i][5];

        // Check if account uses Google login
        if (!currentPasswordHash) {
          return {
            success: false,
            message:
              "Tài khoản này đăng nhập bằng Google, không thể đổi mật khẩu",
          };
        }

        // Verify current password
        if (
          !verifyPassword(passwordData.currentPassword, currentPasswordHash)
        ) {
          return {
            success: false,
            message: "Mật khẩu hiện tại không đúng",
          };
        }

        // Hash new password
        const newPasswordHash = hashPassword(passwordData.newPassword);

        // Update password (column 5, index 6)
        usersSheet.getRange(i + 1, 6).setValue(newPasswordHash);

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: passwordData.userId,
          action: "CHANGE_PASSWORD",
          details: "Password changed successfully",
        });

        Logger.log("Password changed successfully");

        return {
          success: true,
          message: "Đổi mật khẩu thành công!",
        };
      }
    }

    return {
      success: false,
      message: "Không tìm thấy người dùng",
    };
  } catch (error) {
    Logger.log("Error in changeUserPassword: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Save user theme preference
 * @param {string} userId - ID of the user
 * @param {string} themeName - Theme name ('default', 'forest', etc.)
 * @returns {object} - {success, message}
 */
function saveUserTheme(userId, themeName) {
  try {
    Logger.log("=== SAVE USER THEME ===");
    Logger.log("User ID: " + userId);
    Logger.log("Theme: " + themeName);

    if (!userId) {
      return { success: false, message: "User ID is required" };
    }

    var allowedThemes = ["forest"];
    if (allowedThemes.indexOf(themeName) === -1) {
      return { success: false, message: "Invalid theme name" };
    }

    var usersSheet = getSheet("Users");
    if (!usersSheet) {
      return { success: false, message: "System error" };
    }

    var data = usersSheet.getDataRange().getValues();
    var headers = data[0];

    // Find or create 'theme' column
    var themeColIndex = headers.indexOf("theme");
    if (themeColIndex === -1) {
      // Add 'theme' column at the end
      var lastCol = headers.length + 1;
      usersSheet.getRange(1, lastCol).setValue("theme");
      themeColIndex = lastCol - 1;
      Logger.log("Created 'theme' column at index: " + themeColIndex);
    }

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        usersSheet.getRange(i + 1, themeColIndex + 1).setValue(themeName);

        Logger.log("Theme saved successfully: " + themeName);
        return {
          success: true,
          message: "Theme saved",
          theme: themeName,
        };
      }
    }

    return { success: false, message: "User not found" };
  } catch (error) {
    Logger.log("Error in saveUserTheme: " + error.toString());
    return { success: false, message: "Error: " + error.toString() };
  }
}

/**
 * Lưu URL Avatar mới cho user
 * @param {string} userId - ID của user
 * @param {string} avatarUrl - URL của avatar được chọn
 * @returns {object} - {success, avatarUrl, message}
 */
function saveUserAvatarUrl(userId, avatarUrl) {
  try {
    Logger.log("=== SAVE USER AVATAR URL ===");
    Logger.log("User ID: " + userId);
    Logger.log("Avatar URL: " + avatarUrl);

    if (!userId) {
      return {
        success: false,
        message: "User ID is required",
      };
    }

    if (!avatarUrl) {
      return {
        success: false,
        message: "Avatar URL is required",
      };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống",
      };
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const avatarUrlIndex = headers.indexOf("avatarUrl");

    if (avatarUrlIndex === -1) {
      return {
        success: false,
        message: "Không tìm thấy cột avatarUrl",
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // Update avatarUrl (column avatarUrl)
        usersSheet.getRange(i + 1, avatarUrlIndex + 1).setValue(avatarUrl);

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: userId,
          action: "UPDATE_AVATAR",
          details: "Updated avatar URL: " + avatarUrl,
        });

        Logger.log("Avatar URL updated successfully");

        return {
          success: true,
          avatarUrl: avatarUrl,
          message: "Cập nhật avatar thành công!",
        };
      }
    }

    return {
      success: false,
      message: "Không tìm thấy người dùng",
    };
  } catch (error) {
    Logger.log("Error in saveUserAvatarUrl: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

const PET_GLOBAL_RESET_VERSION = "2026-04-17-lv1-random-egg-v1";
const PET_GLOBAL_RESET_PROPERTY_KEY = "PET_GLOBAL_RESET_VERSION";
const PET_EGG_VARIANT_COUNT = 12;
const PET_EGG_VARIANT_BASE_ID = 12;
const PET_MAX_OWNED_VARIANTS = 999;
const PET_DEFAULT_NAME = "NAMEPET";

function pickRandomPetEggIndex_() {
  return Math.floor(Math.random() * PET_EGG_VARIANT_COUNT);
}

function normalizePetEggIndex_(value, fallback) {
  var n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0 || n >= PET_EGG_VARIANT_COUNT) return fallback;
  return n;
}

function normalizePetVariantIndex_(value, fallback) {
  var n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function getPetVariantIdByEggIndex_(index) {
  var normalizedIndex = normalizePetEggIndex_(index, 0);
  return "pet-" + String(PET_EGG_VARIANT_BASE_ID + normalizedIndex);
}

function normalizeOwnedVariantIds_(ownedVariantIds, fallbackVariantId) {
  var uniqueIds = [];

  if (Array.isArray(ownedVariantIds)) {
    ownedVariantIds.forEach(function (id) {
      var safeId = String(id || "").trim();
      if (!safeId) return;
      if (uniqueIds.indexOf(safeId) !== -1) return;
      uniqueIds.push(safeId);
    });
  }

  var safeFallback = String(fallbackVariantId || "").trim();
  if (safeFallback && uniqueIds.indexOf(safeFallback) === -1) {
    uniqueIds.unshift(safeFallback);
  }

  return uniqueIds.slice(0, PET_MAX_OWNED_VARIANTS);
}

function normalizePetNameValue_(value) {
  var safe = String(value || "").trim();
  if (!safe) return PET_DEFAULT_NAME;
  return safe.slice(0, 24);
}

function normalizePetUnlockConditionEntry_(entry) {
  var safeEntry = entry || {};
  var type = String(safeEntry.type || "level").trim() || "level";
  var value = safeEntry.value;

  if (type === "level") {
    value = parseInt(value, 10);
    if (!Number.isFinite(value) || value < 1) value = 1;
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
  var raw = unlockCondition || {};

  if (raw && Array.isArray(raw.conditions)) {
    var mode = normalizePetUnlockMode_(raw.mode);
    var normalizedConditions = raw.conditions
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

function describePetUnlockConditionEntry_(condition) {
  var safe = normalizePetUnlockConditionEntry_(condition) || { type: "level", value: 1 };
  var type = String(safe.type || "level");

  if (type === "level") {
    return "Level tiến độ " + String(safe.value || 1);
  }
  if (type === "topic") {
    return "Hoàn thành bài học của topic " + String(safe.value || "");
  }
  if (type === "topic_quiz") {
    return "Hoàn thành Quiz của topic " + String(safe.value || "");
  }
  if (type === "topic_matching") {
    return "Hoàn thành Matching của topic " + String(safe.value || "");
  }

  return type + " " + String(safe.value || "");
}

function describePetUnlockCondition_(unlockCondition) {
  var normalized = normalizePetUnlockCondition_(unlockCondition);
  var conditions = Array.isArray(normalized.conditions)
    ? normalized.conditions
    : [normalized];
  var mode = Array.isArray(normalized.conditions)
    ? normalizePetUnlockMode_(normalized.mode)
    : "all";
  var separator = mode === "any" ? " HOẶC " : " VÀ ";

  return conditions.map(describePetUnlockConditionEntry_).join(separator);
}

function evaluateSinglePetUnlockCondition_(condition, context) {
  var safeCondition = normalizePetUnlockConditionEntry_(condition);
  if (!safeCondition) {
    return {
      success: false,
      message: "Điều kiện mở khóa pet không hợp lệ",
    };
  }

  var unlockType = String(safeCondition.type || "level");
  if (unlockType === "level") {
    var requiredLevel = Math.max(1, parseInt(safeCondition.value, 10) || 1);
    if (context.userLevel < requiredLevel) {
      return {
        success: false,
        message: "Pet này yêu cầu Level tiến độ " + requiredLevel,
        requiredLevel: requiredLevel,
        currentLevel: context.userLevel,
      };
    }

    return { success: true };
  }

  var requiredTopicId = String(safeCondition.value || "").trim();
  if (!requiredTopicId) {
    return {
      success: false,
      message: "Điều kiện mở khóa pet không hợp lệ",
    };
  }

  var topicProgress = context.progressMap[requiredTopicId] || null;
  var isUnlockedByTopic = false;
  if (topicProgress) {
    if (unlockType === "topic") {
      isUnlockedByTopic = !!(topicProgress.completed || topicProgress.lessonCompleted);
    } else if (unlockType === "topic_quiz") {
      isUnlockedByTopic = !!(topicProgress.quizDone || topicProgress.completed);
    } else if (unlockType === "topic_matching") {
      isUnlockedByTopic = !!(topicProgress.matchingDone || topicProgress.completed);
    }
  }

  if (!isUnlockedByTopic) {
    return {
      success: false,
      message: "Bạn chưa đạt điều kiện mở khóa pet này: " + describePetUnlockConditionEntry_(safeCondition),
    };
  }

  return { success: true };
}

function evaluatePetUnlockConditionForPurchase_(unlockCondition, config) {
  var normalizedUnlock = normalizePetUnlockCondition_(unlockCondition);
  var progressionXP = parseInt(config && config.progressionXP, 10) || 0;
  var context = {
    userLevel: Math.floor(progressionXP / 100) + 1,
    progressMap: {},
  };

  var conditions = Array.isArray(normalizedUnlock.conditions)
    ? normalizedUnlock.conditions
    : [normalizedUnlock];
  var unlockMode = Array.isArray(normalizedUnlock.conditions)
    ? normalizePetUnlockMode_(normalizedUnlock.mode)
    : "all";

  var requiresTopicProgress = conditions.some(function (condition) {
    var normalized = normalizePetUnlockConditionEntry_(condition);
    return normalized && String(normalized.type || "level") !== "level";
  });

  if (requiresTopicProgress) {
    var topicProgressResult = getUserTopicProgress();
    if (!topicProgressResult || topicProgressResult.success !== true) {
      return {
        success: false,
        message: "Không thể kiểm tra tiến độ topic của user",
      };
    }
    context.progressMap = topicProgressResult.progress || {};
  }

  for (var i = 0; i < conditions.length; i++) {
    var singleResult = evaluateSinglePetUnlockCondition_(conditions[i], context);
    if (unlockMode === "any") {
      if (singleResult.success) {
        return { success: true };
      }
      continue;
    }

    if (!singleResult.success) {
      return singleResult;
    }
  }

  if (unlockMode === "any") {
    return {
      success: false,
      message: "Bạn chưa đạt bất kỳ điều kiện mở khóa nào: " + describePetUnlockCondition_(unlockCondition),
    };
  }

  return { success: true };
}

function buildFreshPetConfig_(forcedIndex) {
  var defaultIndex = normalizePetEggIndex_(forcedIndex, pickRandomPetEggIndex_());
  var defaultVariantId = getPetVariantIdByEggIndex_(defaultIndex);
  return {
    currentIndex: defaultIndex,
    isLevelTwo: false,
    selectedAccessories: [],
    selectedStageBackgroundIndex: 0,
    progressionXP: 0,
    progressionLevel: 1,
    progressionXPProgress: 0,
    selectionLocked: false,
    lockedVariantId: defaultVariantId,
    currentVariantId: defaultVariantId,
    ownedVariantIds: [defaultVariantId],
    petAccessoryByVariantId: {},
    petProgressByVariantId: (function () {
      var map = {};
      map[defaultVariantId] = 0;
      return map;
    })(),
    petNamesByVariantId: (function () {
      var map = {};
      map[defaultVariantId] = PET_DEFAULT_NAME;
      return map;
    })(),
    petConfigVersion: PET_GLOBAL_RESET_VERSION,
  };
}

function normalizePetAccessoryPosition_(value) {
  var safe = String(value || "").trim().toLowerCase();
  return safe === "left" || safe === "right" || safe === "center" ? safe : "center";
}

function normalizePetAccessoryItem_(item) {
  if (typeof item === "string") {
    var fileNameFromString = String(item || "").trim();
    return fileNameFromString ? { fileName: fileNameFromString, position: "center" } : null;
  }

  if (!item || typeof item !== "object") return null;
  var fileName = String(item.fileName || "").trim();
  if (!fileName) return null;

  return {
    fileName: fileName,
    position: normalizePetAccessoryPosition_(item.position),
  };
}

function normalizePetAccessoryByVariantMap_(rawMap, ownedVariantIds, activeVariantId, rawSelectedAccessories) {
  var normalizedMap = {};
  var usedFiles = {};

  if (rawMap && typeof rawMap === "object") {
    (ownedVariantIds || []).forEach(function (variantId) {
      var safeVariantId = String(variantId || "").trim();
      if (!safeVariantId) return;

      var normalizedItem = normalizePetAccessoryItem_(rawMap[safeVariantId]);
      if (!normalizedItem || !normalizedItem.fileName) return;
      if (usedFiles[normalizedItem.fileName]) return;

      normalizedMap[safeVariantId] = normalizedItem;
      usedFiles[normalizedItem.fileName] = true;
    });
  }

  if (activeVariantId && !normalizedMap[activeVariantId]) {
    var legacyItem = Array.isArray(rawSelectedAccessories)
      ? normalizePetAccessoryItem_(rawSelectedAccessories[0])
      : null;
    if (legacyItem && !usedFiles[legacyItem.fileName]) {
      normalizedMap[activeVariantId] = legacyItem;
      usedFiles[legacyItem.fileName] = true;
    }
  }

  return normalizedMap;
}

function buildLegacySelectedAccessoriesFromMap_(accessoryByVariantMap, activeVariantId) {
  var safeActiveVariantId = String(activeVariantId || "").trim();
  if (!safeActiveVariantId || !accessoryByVariantMap || typeof accessoryByVariantMap !== "object") {
    return [];
  }

  var normalizedItem = normalizePetAccessoryItem_(accessoryByVariantMap[safeActiveVariantId]);
  if (!normalizedItem || !normalizedItem.fileName) {
    return [];
  }

  return [{ fileName: normalizedItem.fileName }];
}

function ensurePetGlobalResetApplied_(usersSheet) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PET_GLOBAL_RESET_PROPERTY_KEY) === PET_GLOBAL_RESET_VERSION) {
    return;
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (props.getProperty(PET_GLOBAL_RESET_PROPERTY_KEY) === PET_GLOBAL_RESET_VERSION) {
      return;
    }

    var data = usersSheet.getDataRange().getValues();
    var headers = data[0] || [];
    var configIdx = headers.indexOf("petConfig");

    if (configIdx === -1) {
      usersSheet.getRange(1, headers.length + 1).setValue("petConfig");
      configIdx = headers.length;
      headers.push("petConfig");
    }

    if (data.length > 1) {
      var resetValues = [];
      for (var i = 1; i < data.length; i++) {
        resetValues.push([JSON.stringify(buildFreshPetConfig_())]);
      }
      usersSheet.getRange(2, configIdx + 1, resetValues.length, 1).setValues(resetValues);
    }

    props.setProperty(PET_GLOBAL_RESET_PROPERTY_KEY, PET_GLOBAL_RESET_VERSION);
  } finally {
    lock.releaseLock();
  }
}

function getUserPetName(userId) {
  const DEFAULT_NAME = "NAMEPET";
  try {
    if (!userId) {
      return { success: false, message: "User ID is required", petName: DEFAULT_NAME };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return { success: false, message: "Users sheet not found", petName: DEFAULT_NAME };
    }

    const allData = usersSheet.getDataRange().getValues();
    const headers = allData[0] || [];
    let petNameIdx = headers.indexOf("petName");
    const progressIdx = headers.indexOf("progressSheetId");
    let userRow = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === userId) {
        userRow = i;
        break;
      }
    }

    if (userRow === -1) {
      return { success: false, message: "User not found", petName: DEFAULT_NAME };
    }

    if (petNameIdx === -1) {
      usersSheet.getRange(1, headers.length + 1).setValue("petName");
      petNameIdx = headers.length;
    }

    let petNameValue = String(
      usersSheet.getRange(userRow + 1, petNameIdx + 1).getValue() || "",
    ).trim();

    // Backward compatibility: migrate legacy value from personal Profile sheet once.
    if (!petNameValue) {
      let legacyName = "";
      const progressSheetId =
        progressIdx !== -1
          ? String(allData[userRow][progressIdx] || "").trim()
          : "";

      if (progressSheetId) {
        try {
          const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
          const profileSheet = userSpreadsheet.getSheetByName("Profile");
          if (profileSheet) {
            const profileHeaders =
              profileSheet.getRange(1, 1, 1, profileSheet.getLastColumn()).getValues()[0] || [];
            const profilePetIdx = profileHeaders.indexOf("petName");
            if (profilePetIdx !== -1) {
              legacyName = String(
                profileSheet.getRange(2, profilePetIdx + 1).getValue() || "",
              ).trim();
            }
          }
        } catch (legacyError) {
          Logger.log("Legacy petName read failed: " + legacyError.toString());
        }
      }

      petNameValue = legacyName || DEFAULT_NAME;
      usersSheet.getRange(userRow + 1, petNameIdx + 1).setValue(petNameValue);
    }

    return { success: true, message: "OK", petName: petNameValue };
  } catch (error) {
    return {
      success: false,
      message: "getUserPetName error: " + error.toString(),
      petName: DEFAULT_NAME,
    };
  }
}

function saveUserPetName(payload) {
  try {
    const DEFAULT_NAME = "NAMEPET";
    const userId = payload && payload.userId ? String(payload.userId).trim() : "";
    const incomingName = payload && payload.petName ? String(payload.petName).trim() : "";
    const petName = (incomingName || DEFAULT_NAME).slice(0, 24);

    if (!userId) {
      return { success: false, message: "User ID is required", petName: DEFAULT_NAME };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return { success: false, message: "Users sheet not found", petName: DEFAULT_NAME };
    }

    const allData = usersSheet.getDataRange().getValues();
    const headers = allData[0] || [];
    let petNameIdx = headers.indexOf("petName");
    const progressIdx = headers.indexOf("progressSheetId");
    let userRow = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === userId) {
        userRow = i;
        break;
      }
    }

    if (userRow === -1) {
      return { success: false, message: "User not found", petName: DEFAULT_NAME };
    }

    if (petNameIdx === -1) {
      usersSheet.getRange(1, headers.length + 1).setValue("petName");
      petNameIdx = headers.length;
    }

    usersSheet.getRange(userRow + 1, petNameIdx + 1).setValue(petName);

    // Keep legacy profile column in sync if user has personal sheet.
    const progressSheetId =
      progressIdx !== -1
        ? String(allData[userRow][progressIdx] || "").trim()
        : "";
    if (progressSheetId) {
      try {
        const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
        const profileSheet = userSpreadsheet.getSheetByName("Profile");
        if (profileSheet) {
          const profileHeaders =
            profileSheet.getRange(1, 1, 1, profileSheet.getLastColumn()).getValues()[0] || [];
          let profilePetIdx = profileHeaders.indexOf("petName");
          if (profilePetIdx === -1) {
            profileSheet.getRange(1, profileHeaders.length + 1).setValue("petName");
            profilePetIdx = profileHeaders.length;
          }
          profileSheet.getRange(2, profilePetIdx + 1).setValue(petName);
        }
      } catch (legacySyncError) {
        Logger.log("Legacy petName sync failed: " + legacySyncError.toString());
      }
    }

    logActivity({
      level: "INFO",
      category: "USER",
      userId: userId,
      action: "UPDATE_PET_NAME",
      details: "Updated pet name to " + petName,
    });

    return { success: true, message: "Đã lưu tên PET", petName: petName };
  } catch (error) {
    return {
      success: false,
      message: "saveUserPetName error: " + error.toString(),
      petName: "NAMEPET",
    };
  }
}

/**
 * Get user's pet configuration (color, level, accessories, background)
 */
function getUserPetConfig(userId) {
  try {
    if (!userId) return { success: false, message: "User ID is required" };
    const safeUserId = String(userId).trim();
    const usersSheet = getSheet("Users");
    if (!usersSheet) return { success: false, message: "Users sheet not found" };

    ensurePetGlobalResetApplied_(usersSheet);

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0] || [];
    let configIdx = headers.indexOf("petConfig");
    let userRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === safeUserId) {
            userRow = i;
            break;
        }
    }

    if (userRow === -1) return { success: false, message: "User not found" };

    if (configIdx === -1) {
        usersSheet.getRange(1, headers.length + 1).setValue("petConfig");
        configIdx = headers.length;
    }

    const configCell = usersSheet.getRange(userRow + 1, configIdx + 1);
    const configValue = configCell.getValue();
    let parsedConfig = null;
    let shouldPersist = false;

    if (!configValue) {
      parsedConfig = buildFreshPetConfig_();
      shouldPersist = true;
    } else {
      try {
        parsedConfig = JSON.parse(configValue);
      } catch (parseError) {
        parsedConfig = buildFreshPetConfig_();
        shouldPersist = true;
      }
    }

    if (!parsedConfig || typeof parsedConfig !== "object") {
      parsedConfig = buildFreshPetConfig_();
      shouldPersist = true;
    }

    const normalizedIndex = normalizePetVariantIndex_(parsedConfig.currentIndex, pickRandomPetEggIndex_());
    if (normalizedIndex !== parsedConfig.currentIndex) {
      shouldPersist = true;
    }
    parsedConfig.currentIndex = normalizedIndex;

    const rawBackgroundIndex = parsedConfig.selectedStageBackgroundIndex;
    const parsedBackgroundIndex = parseInt(rawBackgroundIndex, 10);
    const normalizedBackgroundIndex = Number.isFinite(parsedBackgroundIndex)
      ? Math.max(0, parsedBackgroundIndex)
      : 0;
    if (rawBackgroundIndex !== normalizedBackgroundIndex) {
      shouldPersist = true;
    }
    parsedConfig.selectedStageBackgroundIndex = normalizedBackgroundIndex;

    const progressionXP = parseInt(parsedConfig.progressionXP, 10);
    const legacyLevel = parseInt(parsedConfig.progressionLevel, 10);
    const legacyProgress = parseInt(parsedConfig.progressionXPProgress, 10);
    let normalizedXP = Number.isFinite(progressionXP) ? progressionXP : 0;

    // Backward compatibility: reconstruct XP if only level/progress were saved.
    if (!Number.isFinite(progressionXP) && Number.isFinite(legacyLevel)) {
      const safeLevel = Math.max(1, legacyLevel);
      const safeProgress = Number.isFinite(legacyProgress)
        ? Math.max(0, Math.min(99, legacyProgress))
        : 0;
      normalizedXP = (safeLevel - 1) * 100 + safeProgress;
    }

    const normalizedLevel = Math.floor(normalizedXP / 100) + 1;
    const normalizedProgress = normalizedXP % 100;

    parsedConfig.progressionXP = normalizedXP;
    parsedConfig.progressionLevel = normalizedLevel;
    parsedConfig.progressionXPProgress = normalizedProgress;

    const rawSelectionLocked = parsedConfig.selectionLocked;
    const rawOwnedVariantIds = parsedConfig.ownedVariantIds;
    const rawOwnedPetCount = parseInt(parsedConfig.ownedPetCount, 10);
    const rawLockedVariantId = String(parsedConfig.lockedVariantId || "").trim();
    const rawCurrentVariantId = String(parsedConfig.currentVariantId || "").trim();

    const inferredVariantId =
      normalizedIndex >= 0 && normalizedIndex < PET_EGG_VARIANT_COUNT
        ? getPetVariantIdByEggIndex_(normalizedIndex)
        : "";
    const legacyLockedVariantId = String(parsedConfig.lockedVariantId || "").trim();
    const currentVariantId = String(
      parsedConfig.currentVariantId || legacyLockedVariantId || inferredVariantId,
    ).trim();

    const normalizedCurrentVariantId = currentVariantId || inferredVariantId;
    parsedConfig.currentVariantId = normalizedCurrentVariantId;

    const ownedVariantIds = normalizeOwnedVariantIds_(
      parsedConfig.ownedVariantIds,
      normalizedCurrentVariantId,
    );
    parsedConfig.currentVariantId = normalizedCurrentVariantId || ownedVariantIds[0] || "";
    parsedConfig.ownedVariantIds = ownedVariantIds;
    parsedConfig.ownedPetCount = ownedVariantIds.length;
    parsedConfig.selectionLocked = false;
    parsedConfig.lockedVariantId = ownedVariantIds[0] || parsedConfig.currentVariantId || "";

    const rawProgressMap =
      parsedConfig.petProgressByVariantId && typeof parsedConfig.petProgressByVariantId === "object"
        ? parsedConfig.petProgressByVariantId
        : {};
    const rawNamesMap =
      parsedConfig.petNamesByVariantId && typeof parsedConfig.petNamesByVariantId === "object"
        ? parsedConfig.petNamesByVariantId
        : {};
    const rawAccessoryByVariantMap =
      parsedConfig.petAccessoryByVariantId && typeof parsedConfig.petAccessoryByVariantId === "object"
        ? parsedConfig.petAccessoryByVariantId
        : {};
    const rawSelectedAccessories = Array.isArray(parsedConfig.selectedAccessories)
      ? parsedConfig.selectedAccessories
      : [];

    const normalizedProgressByVariant = {};
    ownedVariantIds.forEach(function (variantId) {
      const safeVariantId = String(variantId || "").trim();
      if (!safeVariantId) return;
      const mapXP = parseInt(rawProgressMap[safeVariantId], 10);
      if (Number.isFinite(mapXP) && mapXP >= 0) {
        normalizedProgressByVariant[safeVariantId] = mapXP;
      }
    });

    if (!Object.keys(normalizedProgressByVariant).length) {
      const fallbackVariantId = String(parsedConfig.currentVariantId || parsedConfig.lockedVariantId || "").trim();
      if (fallbackVariantId) {
        normalizedProgressByVariant[fallbackVariantId] = normalizedXP;
      }
    }

    ownedVariantIds.forEach(function (variantId) {
      var safeVariantId = String(variantId || "").trim();
      if (!safeVariantId) return;
      if (!Number.isFinite(parseInt(normalizedProgressByVariant[safeVariantId], 10))) {
        normalizedProgressByVariant[safeVariantId] = 0;
      }
    });

    const activeVariantId = String(parsedConfig.currentVariantId || parsedConfig.lockedVariantId || ownedVariantIds[0] || "").trim();
    parsedConfig.progressionXP = parseInt(normalizedProgressByVariant[activeVariantId], 10);
    if (!Number.isFinite(parsedConfig.progressionXP) || parsedConfig.progressionXP < 0) {
      parsedConfig.progressionXP = normalizedXP;
    }
    parsedConfig.progressionLevel = Math.floor(parsedConfig.progressionXP / 100) + 1;
    parsedConfig.progressionXPProgress = parsedConfig.progressionXP % 100;

    const normalizedNamesByVariant = {};
    ownedVariantIds.forEach(function (variantId) {
      const safeVariantId = String(variantId || "").trim();
      if (!safeVariantId) return;
      normalizedNamesByVariant[safeVariantId] = normalizePetNameValue_(rawNamesMap[safeVariantId]);
    });

    parsedConfig.petProgressByVariantId = normalizedProgressByVariant;
    parsedConfig.petNamesByVariantId = normalizedNamesByVariant;
    parsedConfig.petAccessoryByVariantId = normalizePetAccessoryByVariantMap_(
      rawAccessoryByVariantMap,
      ownedVariantIds,
      activeVariantId,
      rawSelectedAccessories,
    );
    parsedConfig.selectedAccessories = buildLegacySelectedAccessoriesFromMap_(
      parsedConfig.petAccessoryByVariantId,
      activeVariantId,
    );

    if (
      rawSelectionLocked !== false ||
      !Array.isArray(rawOwnedVariantIds) ||
      !rawOwnedVariantIds.length ||
      !Number.isFinite(rawOwnedPetCount) ||
      rawOwnedPetCount !== ownedVariantIds.length ||
      rawLockedVariantId !== String((ownedVariantIds[0] || normalizedCurrentVariantId || "")).trim() ||
      rawCurrentVariantId !== normalizedCurrentVariantId ||
      JSON.stringify(rawProgressMap) !== JSON.stringify(normalizedProgressByVariant) ||
      JSON.stringify(rawNamesMap) !== JSON.stringify(normalizedNamesByVariant) ||
      JSON.stringify(rawAccessoryByVariantMap) !== JSON.stringify(parsedConfig.petAccessoryByVariantId) ||
      JSON.stringify(rawSelectedAccessories) !== JSON.stringify(parsedConfig.selectedAccessories)
    ) {
      shouldPersist = true;
    }

    if (parsedConfig.petConfigVersion !== PET_GLOBAL_RESET_VERSION) {
      parsedConfig.petConfigVersion = PET_GLOBAL_RESET_VERSION;
      shouldPersist = true;
    }

    if (shouldPersist) {
      configCell.setValue(JSON.stringify(parsedConfig));
    }

    return { success: true, config: parsedConfig };
  } catch (error) {
    Logger.log("Error in getUserPetConfig: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Save user's pet configuration
 */
function saveUserPetConfig(userId, config) {
  try {
    if (!userId) return { success: false, message: "User ID is required" };
    const safeUserId = String(userId).trim();
    const usersSheet = getSheet("Users");
    if (!usersSheet) return { success: false, message: "Users sheet not found" };

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    let configIdx = headers.indexOf("petConfig");
    const progressIdx = headers.indexOf("progressSheetId");
    let userRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === safeUserId) {
            userRow = i;
            break;
        }
    }

    if (userRow === -1) return { success: false, message: "User not found" };

    if (configIdx === -1) {
        usersSheet.getRange(1, headers.length + 1).setValue("petConfig");
        configIdx = headers.length;
    }

    const safeConfig = config && typeof config === "object" ? config : {};
    const normalizedIndex = normalizePetVariantIndex_(safeConfig.currentIndex, 0);
    const parsedBackgroundIndex = parseInt(safeConfig.selectedStageBackgroundIndex, 10);
    const normalizedBackgroundIndex = Number.isFinite(parsedBackgroundIndex)
      ? Math.max(0, parsedBackgroundIndex)
      : 0;
    const progressionXP = parseInt(safeConfig.progressionXP, 10);
    const normalizedXP = Number.isFinite(progressionXP) ? Math.max(0, progressionXP) : 0;
    let currentVariantId = String(safeConfig.currentVariantId || "").trim();
    if (!currentVariantId) {
      currentVariantId =
        normalizedIndex >= 0 && normalizedIndex < PET_EGG_VARIANT_COUNT
          ? getPetVariantIdByEggIndex_(normalizedIndex)
          : "";
    }

    const ownedVariantIds = normalizeOwnedVariantIds_(safeConfig.ownedVariantIds, currentVariantId);
    const lockedVariantId = ownedVariantIds[0] || currentVariantId || "";

    const rawProgressByVariant =
      safeConfig.petProgressByVariantId && typeof safeConfig.petProgressByVariantId === "object"
        ? safeConfig.petProgressByVariantId
        : {};
    const rawNamesByVariant =
      safeConfig.petNamesByVariantId && typeof safeConfig.petNamesByVariantId === "object"
        ? safeConfig.petNamesByVariantId
        : {};
    const rawAccessoryByVariantMap =
      safeConfig.petAccessoryByVariantId && typeof safeConfig.petAccessoryByVariantId === "object"
        ? safeConfig.petAccessoryByVariantId
        : {};
    const rawSelectedAccessories = Array.isArray(safeConfig.selectedAccessories)
      ? safeConfig.selectedAccessories
      : [];

    const normalizedProgressByVariant = {};
    ownedVariantIds.forEach(function (variantId) {
      const safeVariantId = String(variantId || "").trim();
      if (!safeVariantId) return;
      const mapXP = parseInt(rawProgressByVariant[safeVariantId], 10);
      if (Number.isFinite(mapXP) && mapXP >= 0) {
        normalizedProgressByVariant[safeVariantId] = mapXP;
      }
    });

    if (!Object.keys(normalizedProgressByVariant).length && currentVariantId) {
      normalizedProgressByVariant[currentVariantId] = normalizedXP;
    }

    const effectiveXP = Number.isFinite(parseInt(normalizedProgressByVariant[currentVariantId], 10))
      ? parseInt(normalizedProgressByVariant[currentVariantId], 10)
      : normalizedXP;
    normalizedProgressByVariant[currentVariantId] = Math.max(0, effectiveXP);

    const normalizedLevel = Math.floor(normalizedProgressByVariant[currentVariantId] / 100) + 1;
    const normalizedProgress = normalizedProgressByVariant[currentVariantId] % 100;

    const normalizedNamesByVariant = {};
    ownedVariantIds.forEach(function (variantId) {
      const safeVariantId = String(variantId || "").trim();
      if (!safeVariantId) return;
      normalizedNamesByVariant[safeVariantId] = normalizePetNameValue_(rawNamesByVariant[safeVariantId]);
    });

    const normalizedAccessoryByVariant = normalizePetAccessoryByVariantMap_(
      rawAccessoryByVariantMap,
      ownedVariantIds,
      currentVariantId,
      rawSelectedAccessories,
    );
    const normalizedSelectedAccessories = buildLegacySelectedAccessoriesFromMap_(
      normalizedAccessoryByVariant,
      currentVariantId,
    );

    const normalizedConfig = Object.assign({}, safeConfig, {
      currentIndex: normalizedIndex,
      selectedAccessories: normalizedSelectedAccessories,
      selectedStageBackgroundIndex: normalizedBackgroundIndex,
      progressionXP: normalizedProgressByVariant[currentVariantId],
      progressionLevel: normalizedLevel,
      progressionXPProgress: normalizedProgress,
      selectionLocked: false,
      currentVariantId: currentVariantId,
      ownedVariantIds: ownedVariantIds,
      ownedPetCount: ownedVariantIds.length,
      lockedVariantId: lockedVariantId,
      petAccessoryByVariantId: normalizedAccessoryByVariant,
      petProgressByVariantId: normalizedProgressByVariant,
      petNamesByVariantId: normalizedNamesByVariant,
      petConfigVersion: PET_GLOBAL_RESET_VERSION,
    });

    const configString = JSON.stringify(normalizedConfig);
    usersSheet.getRange(userRow + 1, configIdx + 1).setValue(configString);

    // Sync to personal spreadsheet if possible
    const progressSheetId = progressIdx !== -1 ? String(data[userRow][progressIdx] || "").trim() : "";
    if (progressSheetId) {
       try {
         const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
         let profileSheet = userSpreadsheet.getSheetByName("Profile");
         if (!profileSheet) profileSheet = userSpreadsheet.insertSheet("Profile");
         
         const profileHeaders = profileSheet.getRange(1, 1, 1, Math.max(1, profileSheet.getLastColumn())).getValues()[0] || [];
         let profileConfigIdx = profileHeaders.indexOf("petConfig");
         if (profileConfigIdx === -1) {
           profileSheet.getRange(1, profileHeaders.length + 1).setValue("petConfig");
           profileConfigIdx = profileHeaders.length;
         }
         profileSheet.getRange(2, profileConfigIdx + 1).setValue(configString);
       } catch (e) {
         Logger.log("Personal sheet sync failed: " + e.toString());
       }
    }

    logActivity({
        level: "INFO",
        category: "USER",
        userId: userId,
        action: "UPDATE_PET_CONFIG",
        details: "Updated pet configuration",
    });

    return { success: true, message: "Đã lưu cấu hình PET" };
  } catch (error) {
    Logger.log("Error in saveUserPetConfig: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function purchaseUserPetVariant(payload) {
  try {
    var safePayload = payload && typeof payload === "object" ? payload : {};
    var userId = String(safePayload.userId || "").trim();
    var variantId = String(safePayload.variantId || "").trim();

    if (!userId) return { success: false, message: "User ID is required" };
    if (!variantId) return { success: false, message: "Variant ID is required" };

    var usersSheet = getSheet("Users");
    if (!usersSheet) return { success: false, message: "Users sheet not found" };

    var data = usersSheet.getDataRange().getValues();
    var headers = data[0] || [];
    var userRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === userId) {
        userRow = i;
        break;
      }
    }
    if (userRow === -1) return { success: false, message: "User not found" };

    var xqpIdx = headers.indexOf("totalXQP");
    var xpIdx = headers.indexOf("totalXP");
    if (xqpIdx === -1) {
      usersSheet.getRange(1, headers.length + 1).setValue("totalXQP");
      xqpIdx = headers.length;
      headers.push("totalXQP");

      if (data.length > 1) {
        var fillValues = [];
        for (var r = 1; r < data.length; r++) {
          var backfillXP = xpIdx >= 0 ? parseInt(data[r][xpIdx], 10) || 0 : 0;
          fillValues.push([backfillXP]);
        }
        usersSheet.getRange(2, xqpIdx + 1, fillValues.length, 1).setValues(fillValues);
      }

      data = usersSheet.getDataRange().getValues();
      headers = data[0] || [];
    }

    var variantsResult = getPetVariantsForAdmin();
    if (!variantsResult || variantsResult.success !== true) {
      return {
        success: false,
        message:
          (variantsResult && variantsResult.message) ||
          "Không tải được danh sách pet variants",
      };
    }

    var variant = (variantsResult.variants || []).find(function (item) {
      return String((item && item.id) || "").trim() === variantId;
    });
    if (!variant) return { success: false, message: "Pet không tồn tại" };

    var configResult = getUserPetConfig(userId);
    if (!configResult || configResult.success !== true || !configResult.config) {
      return {
        success: false,
        message:
          (configResult && configResult.message) || "Không tải được cấu hình pet của user",
      };
    }

    var config = configResult.config;
    var ownedVariantIds = normalizeOwnedVariantIds_(
      config.ownedVariantIds,
      String(config.currentVariantId || config.lockedVariantId || "").trim(),
    );

    if (ownedVariantIds.indexOf(variantId) !== -1) {
      return {
        success: true,
        message: "Bạn đã sở hữu pet này",
        alreadyOwned: true,
        newTotalXQP: parseInt(data[userRow][xqpIdx], 10) || 0,
        config: config,
      };
    }

    var maxOwned = Math.max(1, Math.min(PET_MAX_OWNED_VARIANTS, (variantsResult.variants || []).length || PET_MAX_OWNED_VARIANTS));
    if (ownedVariantIds.length >= maxOwned) {
      return {
        success: false,
        message: "Bạn đã sở hữu toàn bộ PET hiện có",
        maxOwned: maxOwned,
      };
    }

    var unlockCheck = evaluatePetUnlockConditionForPurchase_(variant.unlockCondition, config);
    if (!unlockCheck.success) {
      return {
        success: false,
        message: unlockCheck.message || "Bạn chưa đạt điều kiện mở khóa pet này",
        requiredLevel: unlockCheck.requiredLevel,
        currentLevel: unlockCheck.currentLevel,
      };
    }

    var priceXqp = Math.max(0, parseInt(variant.secondPetPriceXqp, 10) || 0);
    var currentXQP = parseInt(data[userRow][xqpIdx], 10) || 0;
    if (currentXQP < priceXqp) {
      return {
        success: false,
        message: "Không đủ XQP để mua pet này",
        requiredXQP: priceXqp,
        currentXQP: currentXQP,
      };
    }

    var newTotalXQP = currentXQP - priceXqp;
    usersSheet.getRange(userRow + 1, xqpIdx + 1).setValue(newTotalXQP);

    ownedVariantIds.push(variantId);
    ownedVariantIds = normalizeOwnedVariantIds_(ownedVariantIds, variantId);

    config.currentVariantId = variantId;
    config.ownedVariantIds = ownedVariantIds;
    config.selectionLocked = false;
    config.lockedVariantId = ownedVariantIds[0] || variantId;
    config.petConfigVersion = PET_GLOBAL_RESET_VERSION;

    config.petProgressByVariantId =
      config.petProgressByVariantId && typeof config.petProgressByVariantId === "object"
        ? config.petProgressByVariantId
        : {};
    config.petNamesByVariantId =
      config.petNamesByVariantId && typeof config.petNamesByVariantId === "object"
        ? config.petNamesByVariantId
        : {};

    if (!Number.isFinite(parseInt(config.petProgressByVariantId[variantId], 10))) {
      config.petProgressByVariantId[variantId] = 0;
    }
    config.petNamesByVariantId[variantId] = normalizePetNameValue_(variant.name);

    var variantNumericId = parseInt(String(variantId).replace(/^pet-/i, ""), 10);
    if (Number.isFinite(variantNumericId)) {
      var mappedIndex = variantNumericId - PET_EGG_VARIANT_BASE_ID;
      if (mappedIndex >= 0) {
        config.currentIndex = mappedIndex;
      }
    }

    saveUserPetConfig(userId, config);

    return {
      success: true,
      message: "Mua pet thành công",
      variantId: variantId,
      priceXqp: priceXqp,
      newTotalXQP: newTotalXQP,
      config: config,
    };
  } catch (error) {
    Logger.log("Error in purchaseUserPetVariant: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
