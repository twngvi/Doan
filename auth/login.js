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
    const emailIndex = headers.indexOf("email");
    const passwordIndex = headers.indexOf("passwordHash");
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

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: data[i][0],
          action: "LOGIN",
          details: "Logged in with email: " + credentials.email,
        });

        Logger.log("Login successful: " + credentials.email);

        return {
          success: true,
          message: "Đăng nhập thành công!",
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            role: data[i][6],
            level: data[i][7],
            totalXP: data[i][8],
            progressSheetId: data[i][12],
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
        return {
          status: "success",
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            role: data[i][6],
            level: data[i][7],
            totalXP: data[i][8],
            lastLogin: data[i][17],
            isActive: data[i][18],
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
