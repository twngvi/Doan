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
            progressSheetId: data[i][24],
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
 * Save pet name for user
 * @param {string} userId - ID của user
 * @param {string} petName - Tên thú cưng mới
 * @returns {{success: boolean, message: string, petName?: string}} - Result object
 */
function saveUserPetName(userId, petName) {
  try {
    Logger.log("=== SAVE PET NAME ===");
    Logger.log("User ID: " + userId);

    if (!userId) {
      return { success: false, message: "User ID is required" };
    }

    var cleanName = String(petName || "gà con").trim().slice(0, 30) || "gà con";

    var usersSheet = getSheet("Users");
    if (!usersSheet) {
      return { success: false, message: "Lỗi hệ thống" };
    }

    var data = usersSheet.getDataRange().getValues();
    var headers = data[0];

    var petNameColIndex = headers.indexOf("petName");
    if (petNameColIndex === -1) {
      var lastCol = headers.length + 1;
      usersSheet.getRange(1, lastCol).setValue("petName");
      petNameColIndex = lastCol - 1;
      Logger.log("Created 'petName' column at index: " + petNameColIndex);
    }

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        usersSheet.getRange(i + 1, petNameColIndex + 1).setValue(cleanName);
        Logger.log("Pet name saved: " + cleanName);
        return { success: true, message: "Đã lưu tên thú cưng!", petName: cleanName };
      }
    }

    return { success: false, message: "Không tìm thấy người dùng" };
  } catch (error) {
    Logger.log("Error in savePetName: " + error.toString());
    return { success: false, message: "Lỗi: " + error.toString() };
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
