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
 * Upload and save user avatar
 */
function uploadUserAvatar(avatarData) {
  try {
    Logger.log("=== UPLOAD USER AVATAR ===");
    Logger.log("User ID: " + avatarData.userId);

    if (!avatarData.userId || !avatarData.imageData) {
      return {
        success: false,
        message: "User ID và dữ liệu ảnh là bắt buộc",
      };
    }

    // Get or create avatars folder
    const folderId =
      PropertiesService.getScriptProperties().getProperty("AVATARS_FOLDER_ID");
    let folder;

    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (e) {
        // Folder doesn't exist, create new one
        folder = DriveApp.createFolder("User_Avatars");
        PropertiesService.getScriptProperties().setProperty(
          "AVATARS_FOLDER_ID",
          folder.getId()
        );
      }
    } else {
      folder = DriveApp.createFolder("User_Avatars");
      PropertiesService.getScriptProperties().setProperty(
        "AVATARS_FOLDER_ID",
        folder.getId()
      );
    }

    // Convert base64 to blob
    const imageBlob = Utilities.newBlob(
      Utilities.base64Decode(avatarData.imageData.split(",")[1]),
      avatarData.mimeType || "image/png",
      "avatar_" + avatarData.userId + "_" + new Date().getTime()
    );

    // Delete old avatar if exists
    const files = folder.getFilesByName("avatar_" + avatarData.userId);
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }

    // Upload new avatar
    const file = folder.createFile(imageBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const avatarUrl = "https://drive.google.com/uc?id=" + file.getId();

    // Update user's avatarUrl in database
    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống",
      };
    }

    const data = usersSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === avatarData.userId) {
        // Update avatarUrl (column 6, index 7)
        usersSheet.getRange(i + 1, 7).setValue(avatarUrl);

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: avatarData.userId,
          action: "UPLOAD_AVATAR",
          details: "Uploaded new avatar: " + file.getId(),
        });

        Logger.log("Avatar uploaded successfully");

        return {
          success: true,
          message: "Cập nhật avatar thành công!",
          avatarUrl: avatarUrl,
        };
      }
    }

    return {
      success: false,
      message: "Không tìm thấy người dùng",
    };
  } catch (error) {
    Logger.log("Error in uploadUserAvatar: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
