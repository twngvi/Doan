/**
 * login.js - User Login Functions
 *
 * Chứa các hàm đăng nhập và session management 1234
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
    const totalXQPIndex = headers.indexOf("totalXQP");
    const progressSheetIdIndex = headers.indexOf("progressSheetId");
    const themeIndex = headers.indexOf("theme");
    const verifiedIndex = headers.indexOf("emailVerified");
    const isActiveIndex = headers.indexOf("isActive");
    const lastLoginIndex = headers.indexOf("lastLogin");
    const playerIdIndex = headers.indexOf("playerId");

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

        if (isActiveIndex >= 0) {
          const isActiveVal = data[i][isActiveIndex];
          // Chấp nhận true (boolean), "true" (string), "TRUE" (string), hoặc 1 (number)
          const isActive = isActiveVal === true || String(isActiveVal).toUpperCase() === "TRUE" || isActiveVal === 1;
          
          if (!isActive) {
            Logger.log("Account not active");
            return {
              success: false,
              message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin.",
            };
          }
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

        const activeSessionIdIndex = headers.indexOf("activeSessionId");
        const activeSessionUpdatedAtIndex = headers.indexOf("activeSessionUpdatedAt");

        // Lock entire session check and creation
        const lock = LockService.getScriptLock();
        let sessionId = "";
        let now = new Date();
        let sessionWriteSuccess = false;

        try {
          lock.waitLock(10000); // wait up to 10s

          // Read the latest row data to ensure we don't overwrite another concurrent login
          const latestDataRow = usersSheet.getRange(i + 1, 1, 1, headers.length).getValues()[0];

          if (activeSessionIdIndex >= 0) {
            const currentActiveSession = latestDataRow[activeSessionIdIndex];
            
            let isSessionFresh = true;
            if (activeSessionUpdatedAtIndex >= 0) {
              const lastSeenValue = latestDataRow[activeSessionUpdatedAtIndex];
              const lastSeenTime = lastSeenValue ? new Date(lastSeenValue).getTime() : 0;
              const SESSION_STALE_MS = 90 * 1000; // 90 giây
              isSessionFresh = !!lastSeenTime && Date.now() - lastSeenTime < SESSION_STALE_MS;
            }

            if (currentActiveSession && currentActiveSession !== "" && isSessionFresh && credentials.force !== true) {
              lock.releaseLock();
              return {
                success: false,
                requireConfirmation: true,
                message: "Tài khoản của bạn đang được đăng nhập ở thiết bị khác. Nếu bạn tiếp tục đăng nhập, thiết bị kia sẽ bị đăng xuất. Bạn có muốn tiếp tục?",
              };
            }
          }

          sessionId = "SES_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
          now = new Date();
          
          usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(now);
          
          if (activeSessionIdIndex >= 0) {
            usersSheet.getRange(i + 1, activeSessionIdIndex + 1).setValue(sessionId);
          }
          if (activeSessionUpdatedAtIndex >= 0) {
            usersSheet.getRange(i + 1, activeSessionUpdatedAtIndex + 1).setValue(now);
          }

          SpreadsheetApp.flush();
          sessionWriteSuccess = true;
        } catch (e) {
          Logger.log("Could not obtain lock or write session: " + e.toString());
        } finally {
          if (lock.hasLock()) {
            lock.releaseLock();
          }
        }

        if (!sessionWriteSuccess) {
          return {
            success: false,
            message: "Lỗi hệ thống khi tạo phiên đăng nhập. Vui lòng thử lại.",
          };
        }

        Logger.log("Login successful: " + credentials.email);


        // ⭐ Get avatar URL - ưu tiên stored avatar từ đúng cột
        let avatarUrl = data[i][avatarUrlIndex];
        Logger.log(
          "Avatar URL from DB (index " + avatarUrlIndex + "): " + avatarUrl,
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

        let finalPlayerId = playerIdIndex >= 0 ? data[i][playerIdIndex] : "";
        if (!finalPlayerId || finalPlayerId === "") {
          try {
            finalPlayerId = typeof generatePlayerId === 'function' ? generatePlayerId(usersSheet) : "ID" + Math.floor(Math.random() * 9000 + 1000);
            if (playerIdIndex >= 0) {
              usersSheet.getRange(i + 1, playerIdIndex + 1).setValue(finalPlayerId);
            }
          } catch (e) {
            Logger.log("Could not generate missing playerId: " + e.toString());
          }
        }

        try {
          runPostLoginTasks({
            userId: String(data[i][userIdIndex] || ""),
            email: credentials.email
          });
        } catch (e) {
          Logger.log("Warning: runPostLoginTasks failed during login: " + e.toString());
        }

        return {
          success: true,
          message: "Đăng nhập thành công!",
          user: {
            userId: String(data[i][userIdIndex] || ""),
            username: String(data[i][usernameIndex] || ""),
            email: String(data[i][emailIndex] || ""),
            displayName: String(data[i][displayNameIndex] || ""),
            avatarUrl: String(avatarUrl || ""),
            role: String(data[i][roleIndex] || "USER"),
            level: Number(data[i][levelIndex]) || 1,
            totalXP: Number(data[i][totalXPIndex]) || 0,
            totalXQP: totalXQPIndex >= 0 ? (Number(data[i][totalXQPIndex]) || 0) : 0,
            progressSheetId: String(data[i][progressSheetIdIndex] || ""),
            playerId: String(finalPlayerId || ""),
            theme: themeIndex >= 0 && data[i][themeIndex] ? String(data[i][themeIndex]) : "forest",
            sessionId: String(sessionId || ""),
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
    const headers = data[0] || [];
    const themeIndex = headers.indexOf("theme");
    const totalXQPIndex = headers.indexOf("totalXQP");
    const playerIdIndex = headers.indexOf("playerId");

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // Get avatar URL - use stored avatar or generate Gravatar
        const avatarUrl = data[i][6] || getGravatarUrl(data[i][2]);

        let finalPlayerId = playerIdIndex >= 0 ? data[i][playerIdIndex] : "";
        if (!finalPlayerId || finalPlayerId === "") {
          try {
            finalPlayerId = typeof generatePlayerId === 'function' ? generatePlayerId(usersSheet) : "ID" + Math.floor(Math.random() * 9000 + 1000);
            if (playerIdIndex >= 0) {
              usersSheet.getRange(i + 1, playerIdIndex + 1).setValue(finalPlayerId);
            }
          } catch (e) {
            Logger.log("Could not generate missing playerId: " + e.toString());
          }
        }

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
            totalXQP: totalXQPIndex >= 0 ? (parseInt(data[i][totalXQPIndex]) || 0) : 0,
            lastLogin: data[i][15],
            isActive: data[i][17],
            playerId: finalPlayerId,
            theme:
              themeIndex >= 0 && data[i][themeIndex]
                ? String(data[i][themeIndex])
                : "forest",
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

/**
 * Check if the provided session ID is the active one
 * @param {string} userId - User ID to check
 * @param {string} sessionId - The current session ID of the client
 * @returns {object} Status object
 */
function checkSession(userId, sessionId) {
  try {
    if (!userId || !sessionId) {
      return { status: "FORCE_LOGOUT", message: "Missing credentials" };
    }

    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0] || [];
    
    const userIdIndex = headers.indexOf("userId");
    const activeSessionIdIndex = headers.indexOf("activeSessionId");

    if (userIdIndex === -1 || activeSessionIdIndex === -1) {
      return { 
        status: "FORCE_LOGOUT", 
        message: "Thiếu cột activeSessionId trong Users." 
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][userIdIndex]) === String(userId)) {
        const activeSessionId = String(data[i][activeSessionIdIndex] || "");
        const checkSessionId = String(sessionId || "");
        
        const activeSessionUpdatedAtIndex = headers.indexOf("activeSessionUpdatedAt");
        const isActiveIndex = headers.indexOf("isActive");
        
        // Kiểm tra xem tài khoản có bị khóa không
        if (isActiveIndex >= 0) {
          const isActiveVal = data[i][isActiveIndex];
          const isActive = isActiveVal === true || String(isActiveVal).toUpperCase() === "TRUE" || isActiveVal === 1;
          if (!isActive) {
            // Xóa session để không bị lỗi "đang đăng nhập ở thiết bị khác" sau khi được mở khóa
            usersSheet.getRange(i + 1, activeSessionIdIndex + 1).setValue("");
            if (activeSessionUpdatedAtIndex >= 0) {
              usersSheet.getRange(i + 1, activeSessionUpdatedAtIndex + 1).setValue("");
            }
            return { status: "FORCE_LOGOUT", message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin." };
          }
        }

        // If no active session is set yet (legacy data), consider it valid and update it
        if (!activeSessionId) {
           usersSheet.getRange(i + 1, activeSessionIdIndex + 1).setValue(checkSessionId);
           if (activeSessionUpdatedAtIndex >= 0) {
             usersSheet.getRange(i + 1, activeSessionUpdatedAtIndex + 1).setValue(new Date());
           }
           return { status: "valid" };
        }

        if (activeSessionId === checkSessionId) {
          if (activeSessionUpdatedAtIndex >= 0) {
            usersSheet.getRange(i + 1, activeSessionUpdatedAtIndex + 1).setValue(new Date());
          }
          return { status: "valid" };
        } else {
          return { status: "FORCE_LOGOUT", message: "Tài khoản đang được đăng nhập ở thiết bị khác." };
        }
      }
    }

    return { status: "FORCE_LOGOUT", message: "User not found" };
  } catch (error) {
    Logger.log("Error in checkSession: " + error.toString());
    // In case of error, assume valid to prevent accidental logouts
    return { status: "valid" };
  }
}

/**
 * Clear the active session for a user (called upon explicit logout)
 * @param {string} userId - User ID to clear
 * @param {string} sessionId - Current Session ID of the user logging out
 */
function clearSessionDb(userId, sessionId) {
  try {
    if (!userId) {
      return {
        success: false,
        message: "Missing userId",
      };
    }

    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0] || [];

    const userIdIndex = headers.indexOf("userId");
    const activeSessionIdIndex = headers.indexOf("activeSessionId");

    if (userIdIndex === -1 || activeSessionIdIndex === -1) {
      return {
        success: false,
        message: "Missing activeSessionId column",
      };
    }

    const lock = LockService.getScriptLock();

    try {
      lock.waitLock(10000);

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][userIdIndex]) === String(userId)) {
          const currentActiveSession = String(data[i][activeSessionIdIndex] || "");

          // Chỉ xóa nếu session đang logout đúng là session hiện tại
          // Tránh tab cũ xóa nhầm session mới của thiết bị khác
          if (sessionId && currentActiveSession && currentActiveSession !== String(sessionId)) {
            return {
              success: true,
              skipped: true,
              message: "Session đã thay đổi, không xóa phiên mới.",
            };
          }

          usersSheet.getRange(i + 1, activeSessionIdIndex + 1).setValue("");
          
          const activeSessionUpdatedAtIndex = headers.indexOf("activeSessionUpdatedAt");
          if (activeSessionUpdatedAtIndex >= 0) {
            usersSheet.getRange(i + 1, activeSessionUpdatedAtIndex + 1).setValue("");
          }
          return {
            success: true,
            message: "Session cleared",
          };
        }
      }

      return {
        success: false,
        message: "User not found",
      };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log("Error in clearSessionDb: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Handle heavy tasks after login to avoid blocking the client response
 * @param {object} payload - {userId, email}
 */
function runPostLoginTasks(payload) {
  try {
    if (!payload || !payload.email) return { success: false, message: "Missing email" };
    Logger.log("=== RUN POST LOGIN TASKS ===");
    
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) return { success: false };
    
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const userIdIndex = headers.indexOf("userId");
    const progressSheetIdIndex = headers.indexOf("progressSheetId");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === payload.email) {
        const now = new Date();
        const progressSheetId = data[i][progressSheetIdIndex];
        
        if (progressSheetId) {
          saveLoginToPersonalSheet(progressSheetId, data[i][emailIndex], now);
          try {
            updateUserStreak(data[i][emailIndex]);
          } catch (e) {
            Logger.log("Warning: Could not update streak: " + e.toString());
          }
        }
        
        logActivity({
          level: "INFO",
          category: "USER",
          userId: data[i][userIdIndex],
          action: "LOGIN",
          details: "Logged in with email: " + payload.email,
        });
        
        return { success: true };
      }
    }
    return { success: false, message: "User not found" };
  } catch (error) {
    Logger.log("Error in runPostLoginTasks: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
