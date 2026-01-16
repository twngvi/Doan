/**
 * login.js - User Login Functions
 *
 * Chứa các hàm đăng nhập và session management
 */

/**
 * Login with Email & Password
 */
function loginWithEmail(credentials) {
  try {
    Logger.log("=== LOGIN WITH EMAIL ===");
    Logger.log("Email: " + credentials.email);

    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
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
    const userIdIndex = headers.indexOf("userId");
    const emailIndex = headers.indexOf("email");
    const displayNameIndex = headers.indexOf("displayName");
    const usernameIndex = headers.indexOf("username");
    const passwordIndex = headers.indexOf("passwordHash");
    const avatarUrlIndex = headers.indexOf("avatarUrl");
    const roleIndex = headers.indexOf("role");
    const levelIndex = headers.indexOf("level");
    const totalXPIndex = headers.indexOf("totalXP");
    const progressSheetIdIndex = headers.indexOf("progressSheetId");
    const verifiedIndex = headers.indexOf("emailVerified");
    const isActiveIndex = headers.indexOf("isActive");
    const lastLoginIndex = headers.indexOf("lastLogin");

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === credentials.email) {
        Logger.log("Found user at row: " + (i + 1));

        if (data[i][verifiedIndex] !== true) {
          Logger.log("Email not verified");
          return {
            success: false,
            message: "Email chưa được xác thực. Vui lòng kiểm tra hộp thư.",
          };
        }

        if (data[i][isActiveIndex] !== true) {
          Logger.log("Account not active");
          return {
            success: false,
            message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin.",
          };
        }

        const passwordHash = data[i][passwordIndex];

        if (!passwordHash) {
          return {
            success: false,
            message: "Tài khoản này đăng nhập bằng Google.",
          };
        }

        if (!verifyPassword(credentials.password, passwordHash)) {
          return {
            success: false,
            message: "Mật khẩu không đúng",
          };
        }

        // Update lastLogin
        const now = new Date();
        usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(now);

        // ⭐ Also save login to user's personal sheet
        const progressSheetId = data[i][progressSheetIdIndex];
        if (progressSheetId) {
          saveLoginToPersonalSheet(progressSheetId, data[i][emailIndex], now);
        }

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: data[i][userIdIndex],
          action: "LOGIN",
          details: "Logged in with email: " + credentials.email,
        });

        Logger.log("Login successful: " + credentials.email);

        // ⭐ Get avatar URL - ưu tiên stored avatar từ đúng cột
        let avatarUrl = data[i][avatarUrlIndex];
        Logger.log(
          "Avatar URL from DB (index " + avatarUrlIndex + "): " + avatarUrl
        );

        if (
          !avatarUrl ||
          avatarUrl === "" ||
          avatarUrl === "undefined" ||
          avatarUrl === "null"
        ) {
          // Nếu không có avatar, tạo Gravatar
          avatarUrl = getGravatarUrl(data[i][emailIndex]);
          Logger.log("No avatar found, using Gravatar: " + avatarUrl);
        } else {
          Logger.log("Using stored avatar: " + avatarUrl);
        }

        return {
          success: true,
          message: "Đăng nhập thành công!",
          user: {
            userId: data[i][userIdIndex],
            username: data[i][usernameIndex],
            email: data[i][emailIndex],
            displayName: data[i][displayNameIndex],
            avatarUrl: avatarUrl,
            role: data[i][roleIndex],
            level: data[i][levelIndex],
            totalXP: data[i][totalXPIndex],
            progressSheetId: data[i][progressSheetIdIndex],
          },
        };
      }
    }

    return {
      success: false,
      message: "Email không tồn tại",
    };
  } catch (error) {
    Logger.log("Error in loginWithEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Get user session info
 */
function getUserSession(userId) {
  try {
    if (!userId) {
      return { status: "error", message: "User ID required" };
    }

    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // Get avatar URL - use stored avatar or generate Gravatar
        const avatarUrl = data[i][6] || getGravatarUrl(data[i][2]);

        return {
          status: "success",
          user: {
            userId: data[i][0],
            username: data[i][4],
            email: data[i][2],
            displayName: data[i][3] || data[i][4],
            avatarUrl: avatarUrl,
            role: data[i][7],
            level: data[i][8],
            totalXP: data[i][11],
            lastLogin: data[i][15],
            isActive: data[i][17],
          },
        };
      }
    }

    return { status: "error", message: "User not found" };
  } catch (error) {
    Logger.log("Error in getUserSession: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

/**
 * Save login history to user's personal sheet
 * @param {string} progressSheetId - User's personal sheet ID
 * @param {string} email - User email
 * @param {Date} loginTime - Login timestamp
 */
function saveLoginToPersonalSheet(progressSheetId, email, loginTime) {
  try {
    Logger.log("=== SAVE LOGIN TO PERSONAL SHEET ===");

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    let loginSheet = userSpreadsheet.getSheetByName("Login_History");

    // Create sheet if not exists
    if (!loginSheet) {
      Logger.log("Creating Login_History sheet...");
      loginSheet = userSpreadsheet.insertSheet("Login_History");
      loginSheet.appendRow([
        "id",
        "loginTime",
        "device",
        "ipAddress",
        "sessionDuration",
      ]);

      // Style header
      const headerRange = loginSheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#10B981");
      headerRange.setFontColor("white");
      loginSheet.setFrozenRows(1);
    }

    // Add login entry
    const loginEntry = [
      "LG_" + Date.now(),
      loginTime.toISOString(),
      "Web Browser",
      "N/A",
      "", // Session duration - will be updated on logout
    ];

    loginSheet.appendRow(loginEntry);
    Logger.log("✅ Login saved to personal sheet");
  } catch (error) {
    Logger.log("⚠️ Error saving login to personal sheet: " + error.toString());
    // Don't throw - this is optional functionality
  }
}
