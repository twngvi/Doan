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

    var allowedThemes = ["default", "forest"];
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

function pickRandomPetEggIndex_() {
  return Math.floor(Math.random() * PET_EGG_VARIANT_COUNT);
}

function normalizePetEggIndex_(value, fallback) {
  var n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0 || n >= PET_EGG_VARIANT_COUNT) return fallback;
  return n;
}

function getPetVariantIdByEggIndex_(index) {
  var normalizedIndex = normalizePetEggIndex_(index, 0);
  return "pet-" + String(PET_EGG_VARIANT_BASE_ID + normalizedIndex);
}

function buildFreshPetConfig_(forcedIndex) {
  var defaultIndex = normalizePetEggIndex_(forcedIndex, pickRandomPetEggIndex_());
  return {
    currentIndex: defaultIndex,
    isLevelTwo: false,
    selectedAccessories: [],
    selectedStageBackgroundIndex: 0,
    progressionXP: 0,
    progressionLevel: 1,
    progressionXPProgress: 0,
    selectionLocked: true,
    lockedVariantId: getPetVariantIdByEggIndex_(defaultIndex),
    petConfigVersion: PET_GLOBAL_RESET_VERSION,
  };
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
    const usersSheet = getSheet("Users");
    if (!usersSheet) return { success: false, message: "Users sheet not found" };

    ensurePetGlobalResetApplied_(usersSheet);

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0] || [];
    let configIdx = headers.indexOf("petConfig");
    let userRow = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
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

    const normalizedIndex = normalizePetEggIndex_(parsedConfig.currentIndex, pickRandomPetEggIndex_());
    if (normalizedIndex !== parsedConfig.currentIndex) {
      shouldPersist = true;
    }
    parsedConfig.currentIndex = normalizedIndex;

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

    if (parsedConfig.selectionLocked !== true) {
      parsedConfig.selectionLocked = true;
      shouldPersist = true;
    }

    const lockedVariantId = String(parsedConfig.lockedVariantId || "").trim();
    if (!lockedVariantId) {
      parsedConfig.lockedVariantId = getPetVariantIdByEggIndex_(normalizedIndex);
      shouldPersist = true;
    } else {
      parsedConfig.lockedVariantId = lockedVariantId;
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
    const usersSheet = getSheet("Users");
    if (!usersSheet) return { success: false, message: "Users sheet not found" };

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    let configIdx = headers.indexOf("petConfig");
    const progressIdx = headers.indexOf("progressSheetId");
    let userRow = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
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
    const normalizedIndex = normalizePetEggIndex_(safeConfig.currentIndex, 0);
    const progressionXP = parseInt(safeConfig.progressionXP, 10);
    const normalizedXP = Number.isFinite(progressionXP) ? progressionXP : 0;
    const normalizedLevel = Math.floor(normalizedXP / 100) + 1;
    const normalizedProgress = normalizedXP % 100;
    let lockedVariantId = String(safeConfig.lockedVariantId || "").trim();
    if (!lockedVariantId) {
      lockedVariantId = getPetVariantIdByEggIndex_(normalizedIndex);
    }

    const normalizedConfig = Object.assign({}, safeConfig, {
      currentIndex: normalizedIndex,
      progressionXP: normalizedXP,
      progressionLevel: normalizedLevel,
      progressionXPProgress: normalizedProgress,
      selectionLocked: true,
      lockedVariantId: lockedVariantId,
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
