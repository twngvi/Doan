/**
 * register.js - User Registration Functions
 *
 * Chứa các hàm đăng ký và xác thực email
 */

/**
 * ⭐ Lấy avatar ngẫu nhiên từ danh sách
 */
function getRandomAvatar() {
  const avatarTypes = ["bottts", "dylan", "shapes"];
  const seeds = [
    "Alexander",
    "Mason",
    "Andrea",
    "Oliver",
    "Leo",
    "Leah",
    "Katherine",
    "Jude",
    "Brian",
    "Avery",
    "Vivian",
    "Riley",
    "Valentina",
    "Kimberly",
    "Jocelyn",
    "Aidan",
    "Adrian",
    "Mackenzie",
    "Nolan",
    "Maria",
    "Jameson",
    "Liam",
    "Kingston",
    "Destiny",
    "Christopher",
    "Emery",
    "Sarah",
    "Sara",
    "Sophia",
    "Luis",
    "Robert",
  ];

  const randomType =
    avatarTypes[Math.floor(Math.random() * avatarTypes.length)];
  const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];

  return `https://api.dicebear.com/9.x/${randomType}/svg?seed=${randomSeed}`;
}

/**
 * Register with Email & Password
 */
function registerWithEmail(userData) {
  try {
    Logger.log("=== REGISTER WITH EMAIL ===");
    Logger.log("Email: " + userData.email);

    // Validation
    if (!userData.email || !userData.password || !userData.confirmPassword) {
      return {
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      };
    }

    if (!isValidEmail(userData.email)) {
      return {
        success: false,
        message: "Email không hợp lệ",
      };
    }

    if (userData.password !== userData.confirmPassword) {
      return {
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      };
    }

    if (userData.password.length < 6) {
      return {
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      };
    }

    // Check if email exists
    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống: Không tìm thấy Users sheet",
      };
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const verifiedIndex = headers.indexOf("emailVerified");
    const tokenIndex = headers.indexOf("verificationToken");
    const tokenExpiresIndex = headers.indexOf("verificationExpires");

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === userData.email) {
        if (data[i][verifiedIndex] === true) {
          return {
            success: false,
            message: "Email đã được đăng ký. Vui lòng đăng nhập.",
          };
        }

        // Email exists but not verified - resend verification
        Logger.log("Email exists but not verified. Regenerating token...");

        const newToken = generateVerificationToken();
        const newExpires = new Date();
        newExpires.setHours(newExpires.getHours() + 24);

        usersSheet.getRange(i + 1, tokenIndex + 1).setValue(newToken);
        usersSheet.getRange(i + 1, tokenExpiresIndex + 1).setValue(newExpires);

        const emailSent = sendVerificationEmail(
          userData.email,
          newToken,
          data[i][1] || userData.email.split("@")[0]
        );

        return {
          success: true,
          message: emailSent
            ? "Email đã được đăng ký trước đó nhưng chưa xác thực. Chúng tôi đã gửi lại email xác thực mới."
            : "Email đã được đăng ký nhưng chưa xác thực. Không thể gửi email.",
          requiresVerification: true,
          isResend: true,
          userId: data[i][0],
        };
      }
    }

    // Create new user
    const passwordHash = hashPassword(userData.password);
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const userId = generateNextId(usersSheet, "USR");
    const username = userData.email.split("@")[0];
    const now = new Date();

    // ⭐ TẠO AVATAR NGẪU NHIÊN
    const randomAvatar = getRandomAvatar();
    Logger.log("Generated random avatar: " + randomAvatar);

    // Columns: userId, googleId, email, displayName, username, passwordHash, avatarUrl, role, level, aiLevel, totalPoints, totalXP, currentStreak, longestStreak, lastActiveDate, lastLogin, createdAt, isActive, mountainPosition, mountainStage, mountainProgress, totalQuizAnswered, totalPuzzleSolved, totalChallengeCompleted, progressSheetId, emailVerified, verificationToken, verificationExpires
    const newUser = [
      userId,
      "",
      userData.email,
      userData.fullName || "",
      username,
      passwordHash,
      randomAvatar, // ⭐ AVATAR NGẪU NHIÊN
      "student",
      1,
      1,
      0,
      0,
      0,
      0,
      "",
      "",
      now,
      false,
      0,
      1,
      0,
      0,
      0,
      0,
      "",
      false,
      verificationToken,
      verificationExpires,
    ];

    usersSheet.appendRow(newUser);

    // Send verification email
    const emailSent = sendVerificationEmail(
      userData.email,
      verificationToken,
      userData.fullName || username
    );

    // Log activity
    logActivity({
      level: "INFO",
      category: "USER",
      userId: userId,
      action: "REGISTER",
      details: "Registered with email: " + userData.email,
    });

    Logger.log("User registered: " + userId);

    return {
      success: true,
      message: emailSent
        ? "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản."
        : "Đăng ký thành công! Tuy nhiên không thể gửi email xác thực.",
      requiresVerification: true,
      userId: userId,
      emailSent: emailSent,
      avatarUrl: randomAvatar, // ⭐ RETURN AVATAR
    };
  } catch (error) {
    Logger.log("Error in registerWithEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Verify email with token
 */
function verifyEmail(token) {
  try {
    Logger.log("=== VERIFY EMAIL START ===");
    Logger.log("Token received: " + token);

    if (!token || token === "") {
      return {
        success: false,
        message: "Token không hợp lệ",
      };
    }

    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống: Không tìm thấy bảng Users",
      };
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const tokenIndex = headers.indexOf("verificationToken");
    const expiresIndex = headers.indexOf("verificationExpires");
    const emailVerifiedIndex = headers.indexOf("emailVerified");
    const isActiveIndex = headers.indexOf("isActive");
    const userIdIndex = headers.indexOf("userId");
    const usernameIndex = headers.indexOf("username");
    const progressSheetIdIndex = headers.indexOf("progressSheetId");

    Logger.log("Column indices:");
    Logger.log("  verificationToken: " + tokenIndex);
    Logger.log("  emailVerified: " + emailVerifiedIndex);
    Logger.log("  isActive: " + isActiveIndex);

    if (
      tokenIndex === -1 ||
      expiresIndex === -1 ||
      emailVerifiedIndex === -1 ||
      isActiveIndex === -1
    ) {
      Logger.log("Missing required columns");
      return {
        success: false,
        message: "Lỗi cấu trúc database",
      };
    }

    // Find user with this token
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedToken = row[tokenIndex];

      if (storedToken === token) {
        Logger.log("Token found at row " + (i + 1));

        // Check if token expired
        const expiresDate = new Date(row[expiresIndex]);
        const now = new Date();

        if (now > expiresDate) {
          Logger.log("Token expired");
          return {
            success: false,
            message: "Token đã hết hạn. Vui lòng đăng ký lại.",
          };
        }

        // Check if already verified
        if (row[emailVerifiedIndex] === true) {
          Logger.log("Email already verified");
          return {
            success: true,
            message: "Email đã được xác thực trước đó.",
          };
        }

        // Update user status
        const userId = row[userIdIndex];
        const username = row[usernameIndex];
        const currentProgressSheetId = row[progressSheetIdIndex];

        Logger.log("Updating user: " + userId);

        // Set emailVerified = true
        usersSheet.getRange(i + 1, emailVerifiedIndex + 1).setValue(true);
        Logger.log("Set emailVerified = true");

        // Set isActive = true
        usersSheet.getRange(i + 1, isActiveIndex + 1).setValue(true);
        Logger.log("Set isActive = true");

        // Clear token
        usersSheet.getRange(i + 1, tokenIndex + 1).setValue("");
        usersSheet.getRange(i + 1, expiresIndex + 1).setValue("");
        Logger.log("Cleared verification token");

        // Create personal sheet if needed
        let progressSheetId = currentProgressSheetId;
        if (!progressSheetId || progressSheetId === "") {
          try {
            Logger.log("Creating personal sheet for user: " + userId);
            progressSheetId = createUserPersonalSheet(userId, username);
            usersSheet
              .getRange(i + 1, progressSheetIdIndex + 1)
              .setValue(progressSheetId);
            Logger.log("Created personal sheet: " + progressSheetId);
          } catch (sheetError) {
            Logger.log(
              "Failed to create personal sheet: " + sheetError.toString()
            );
          }
        } else {
          Logger.log("User already has personal sheet: " + progressSheetId);
        }

        // Log activity
        try {
          logActivity({
            level: "INFO",
            category: "USER",
            userId: userId,
            action: "EMAIL_VERIFIED",
            details: "Email verified successfully for user: " + username,
          });
        } catch (logError) {
          Logger.log("Failed to log activity: " + logError.toString());
        }

        Logger.log("=== VERIFY EMAIL SUCCESS ===");

        return {
          success: true,
          message: "Xác thực email thành công! Bạn có thể đăng nhập ngay.",
          userId: userId,
          progressSheetId: progressSheetId,
        };
      }
    }

    Logger.log("Token not found in database");
    return {
      success: false,
      message: "Token không tồn tại hoặc đã được sử dụng",
    };
  } catch (error) {
    Logger.log("Error verifying email: " + error.toString());
    Logger.log("Stack: " + error.stack);
    return {
      success: false,
      message: "Lỗi xác thực: " + error.toString(),
    };
  }
}

/**
 * Resend verification email
 */
function resendVerificationEmail(email) {
  try {
    Logger.log("=== RESEND VERIFICATION EMAIL ===");
    Logger.log("Email: " + email);

    if (!email || !isValidEmail(email)) {
      return {
        success: false,
        message: "Email không hợp lệ",
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
    const verifiedIndex = headers.indexOf("emailVerified");
    const tokenIndex = headers.indexOf("verificationToken");
    const tokenExpiresIndex = headers.indexOf("verificationExpires");

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        if (data[i][verifiedIndex] === true) {
          return {
            success: false,
            message: "Email đã được xác thực. Bạn có thể đăng nhập.",
          };
        }

        const newToken = generateVerificationToken();
        const newExpires = new Date();
        newExpires.setHours(newExpires.getHours() + 24);

        usersSheet.getRange(i + 1, tokenIndex + 1).setValue(newToken);
        usersSheet.getRange(i + 1, tokenExpiresIndex + 1).setValue(newExpires);

        const emailSent = sendVerificationEmail(
          email,
          newToken,
          data[i][1] || email.split("@")[0]
        );

        Logger.log(
          emailSent ? "Resent verification email" : "Failed to send email"
        );

        return {
          success: true,
          message: emailSent
            ? "Email xác thực mới đã được gửi."
            : "Không thể gửi email.",
          emailSent: emailSent,
        };
      }
    }

    return {
      success: false,
      message: "Email không tồn tại trong hệ thống",
    };
  } catch (error) {
    Logger.log("Error in resendVerificationEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Verify email with code (OTP)
 */
function verifyEmailWithCode(verificationData) {
  try {
    Logger.log("=== VERIFY EMAIL WITH CODE ===");
    Logger.log("Email: " + verificationData.email);
    Logger.log("Code: " + verificationData.code);

    if (!verificationData.email || !verificationData.code) {
      return {
        success: false,
        message: "Email và mã xác thực là bắt buộc",
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
    const tokenIndex = headers.indexOf("verificationToken");
    const expiresIndex = headers.indexOf("verificationExpires");
    const emailVerifiedIndex = headers.indexOf("emailVerified");
    const isActiveIndex = headers.indexOf("isActive");

    // Find user by email
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === verificationData.email) {
        const storedCode = data[i][tokenIndex];
        const expiresDate = new Date(data[i][expiresIndex]);
        const now = new Date();

        // Check if code expired
        if (now > expiresDate) {
          return {
            success: false,
            message: "Mã xác thực đã hết hạn. Vui lòng gửi lại mã.",
          };
        }

        // Check if code matches
        // Ép kiểu về String và xóa khoảng trắng thừa để so sánh chính xác
        if (
          String(storedCode).trim() !== String(verificationData.code).trim()
        ) {
          Logger.log(
            "Code mismatch - Stored: [" +
              storedCode +
              "], Received: [" +
              verificationData.code +
              "]"
          );
          return {
            success: false,
            message: "Mã xác thực không đúng. Vui lòng kiểm tra lại.",
          };
        }

        // Verify email and activate account
        usersSheet.getRange(i + 1, emailVerifiedIndex + 1).setValue(true);
        usersSheet.getRange(i + 1, isActiveIndex + 1).setValue(true);
        usersSheet.getRange(i + 1, tokenIndex + 1).setValue(""); // Clear token

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: data[i][0],
          action: "EMAIL_VERIFIED",
          details: "Email verified with OTP code",
        });

        Logger.log(
          "Email verified successfully for: " + verificationData.email
        );

        return {
          success: true,
          message: "Xác thực email thành công! Bạn có thể đăng nhập ngay.",
        };
      }
    }

    return {
      success: false,
      message: "Email không tồn tại trong hệ thống",
    };
  } catch (error) {
    Logger.log("Error in verifyEmailWithCode: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
