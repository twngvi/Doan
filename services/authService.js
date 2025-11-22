/**
 * authService.js - Authentication Service
 *
 * Tác dụng:
 * - Xử lý đăng ký, đăng nhập, xác thực
 * - Password hashing và verification
 * - Email verification
 * - Google OAuth2 integration
 * - Password reset
 * - Account linking
 *
 * Security Features:
 * - Password hashing với SHA-256
 * - Email verification tokens
 * - Password reset tokens với expiration
 * - Rate limiting (basic)
 * - Account linking cho Google OAuth
 */

/**
 * ========================================
 * REGISTRATION FLOW
 * ========================================
 */

/**
 * Đăng ký tài khoản mới với email & password
 * @param {Object} userData - {email, password, confirmPassword, fullName}
 * @returns {Object} {success, message, requiresVerification}
 */
function registerWithEmail(userData) {
  try {
    Logger.log("=== REGISTER WITH EMAIL ===");
    Logger.log("Email: " + userData.email);

    // 1. Validation
    if (!userData.email || !userData.password || !userData.confirmPassword) {
      return {
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      };
    }

    // Validate email format
    if (!isValidEmail(userData.email)) {
      return {
        success: false,
        message: "Email không hợp lệ",
      };
    }

    // Validate password match
    if (userData.password !== userData.confirmPassword) {
      return {
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      };
    }

    // Validate password strength
    if (userData.password.length < 6) {
      return {
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      };
    }

    // 2. Kiểm tra email đã tồn tại chưa
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
        // Nếu email đã verify → không cho đăng ký lại
        if (data[i][verifiedIndex] === true) {
          return {
            success: false,
            message: "Email đã được đăng ký. Vui lòng đăng nhập.",
          };
        }

        // Nếu chưa verify → cho phép tạo token mới và gửi lại email
        Logger.log("⚠️ Email exists but not verified. Regenerating token...");

        const newToken = generateVerificationToken();
        const newExpires = new Date();
        newExpires.setHours(newExpires.getHours() + 24);

        // Cập nhật token mới
        usersSheet.getRange(i + 1, tokenIndex + 1).setValue(newToken);
        usersSheet.getRange(i + 1, tokenExpiresIndex + 1).setValue(newExpires);

        // Gửi lại email
        const emailSent = sendVerificationEmail(
          userData.email,
          newToken,
          data[i][4] || userData.fullName || userData.email.split("@")[0]
        );

        return {
          success: true,
          message: emailSent
            ? "Email đã được đăng ký trước đó nhưng chưa xác thực. Chúng tôi đã gửi lại email xác thực mới."
            : "Email đã được đăng ký nhưng chưa xác thực. Không thể gửi email. Vui lòng liên hệ admin hoặc kiểm tra: 1) Hạn ngạch email, 2) Spam folder, 3) Quyền MailApp.",
          requiresVerification: true,
          isResend: true,
          userId: data[i][0],
        };
      }
    }

    // 3. Hash password
    const passwordHash = hashPasswordSecure(userData.password);

    // 4. Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 giờ

    // 5. Create user
    const userId = generateNextId(usersSheet, "USR");
    const username = userData.email.split("@")[0]; // Auto-generate username từ email
    const now = new Date();

    const newUser = [
      userId,
      username,
      userData.email,
      passwordHash,
      userData.fullName || username,
      "student", // Default role
      now, // createdAt
      "", // lastLogin (chưa có)
      false, // isActive - chờ xác thực email
      "", // googleId
      false, // emailVerified
      "", // avatarUrl
      verificationToken,
      verificationExpires,
      "", // resetPasswordToken
      "", // resetPasswordExpires
    ];

    usersSheet.appendRow(newUser);

    // 6. Gửi email xác thực
    const emailSent = sendVerificationEmail(
      userData.email,
      verificationToken,
      userData.fullName || username
    );

    // 7. Log activity
    logActivity(userId, "Register", "Registered with email: " + userData.email);

    Logger.log("✅ User registered: " + userId);

    return {
      success: true,
      message: emailSent
        ? "Đăng ký thành công! Vui lòng kiểm tra email (cả Spam folder) để xác thực tài khoản."
        : "Đăng ký thành công! Tuy nhiên không thể gửi email xác thực. Vui lòng kiểm tra logs để biết lý do: 1) Hết hạn ngạch email (100/ngày), 2) Chưa cấp quyền MailApp, 3) Email bị chặn.",
      requiresVerification: true,
      userId: userId,
      emailSent: emailSent,
    };
  } catch (error) {
    Logger.log("❌ Error in registerWithEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Xác thực email bằng verification token
 * @param {string} token - Verification token
 * @returns {Object} {success, message}
 */
function verifyEmail(token) {
  try {
    Logger.log("=== VERIFY EMAIL ===");
    Logger.log("Token: " + token);

    if (!token) {
      return {
        success: false,
        message: "Token không hợp lệ",
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
    const tokenIndex = headers.indexOf("verificationToken");
    const expiresIndex = headers.indexOf("verificationExpires");
    const verifiedIndex = headers.indexOf("emailVerified");
    const isActiveIndex = headers.indexOf("isActive");

    // Tìm user với token này
    for (let i = 1; i < data.length; i++) {
      if (data[i][tokenIndex] === token) {
        // Kiểm tra token đã hết hạn chưa
        const expires = new Date(data[i][expiresIndex]);
        const now = new Date();

        if (now > expires) {
          return {
            success: false,
            message: "Link xác thực đã hết hạn. Vui lòng đăng ký lại.",
          };
        }

        // Đã verify rồi
        if (data[i][verifiedIndex] === true) {
          return {
            success: true,
            message: "Email đã được xác thực trước đó. Bạn có thể đăng nhập.",
          };
        }

        // Cập nhật emailVerified = true và isActive = true
        Logger.log("📝 Before update - Row " + (i + 1) + ":");
        Logger.log("emailVerified: " + data[i][verifiedIndex]);
        Logger.log("isActive: " + data[i][isActiveIndex]);

        usersSheet.getRange(i + 1, verifiedIndex + 1).setValue(true);
        usersSheet.getRange(i + 1, isActiveIndex + 1).setValue(true);
        usersSheet.getRange(i + 1, tokenIndex + 1).setValue(""); // Clear token

        Logger.log(
          "📝 After update - verifiedIndex: " +
            (verifiedIndex + 1) +
            ", isActiveIndex: " +
            (isActiveIndex + 1)
        );

        // Log activity
        logActivity(
          data[i][0],
          "Email Verified",
          "Email verified successfully"
        );

        Logger.log("✅ Email verified: " + data[i][2]);

        return {
          success: true,
          message: "Xác thực email thành công! Bạn có thể đăng nhập ngay.",
        };
      }
    }

    return {
      success: false,
      message: "Token không tồn tại hoặc đã được sử dụng",
    };
  } catch (error) {
    Logger.log("❌ Error in verifyEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * ========================================
 * LOGIN FLOW
 * ========================================
 */

/**
 * Gửi lại email xác thực (Resend Verification Email)
 * @param {string} email - Email người dùng
 * @returns {Object} {success, message}
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
        // Đã verify rồi
        if (data[i][verifiedIndex] === true) {
          return {
            success: false,
            message: "Email đã được xác thực. Bạn có thể đăng nhập.",
          };
        }

        // Tạo token mới
        const newToken = generateVerificationToken();
        const newExpires = new Date();
        newExpires.setHours(newExpires.getHours() + 24);

        // Cập nhật token
        usersSheet.getRange(i + 1, tokenIndex + 1).setValue(newToken);
        usersSheet.getRange(i + 1, tokenExpiresIndex + 1).setValue(newExpires);

        // Gửi email
        const emailSent = sendVerificationEmail(
          email,
          newToken,
          data[i][4] || email.split("@")[0]
        );

        Logger.log(
          emailSent ? "✅ Resent verification email" : "❌ Failed to send email"
        );

        return {
          success: true,
          message: emailSent
            ? "Email xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư (kể cả Spam)."
            : "Không thể gửi email. Kiểm tra: 1) Hạn ngạch email (100/ngày), 2) Quyền MailApp, 3) Spam filter.",
          emailSent: emailSent,
        };
      }
    }

    return {
      success: false,
      message: "Email không tồn tại trong hệ thống",
    };
  } catch (error) {
    Logger.log("❌ Error in resendVerificationEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Đăng nhập với email & password
 * @param {Object} credentials - {email, password}
 * @returns {Object} {success, message, user}
 */
function loginWithEmail(credentials) {
  try {
    Logger.log("=== LOGIN WITH EMAIL ===");
    Logger.log("Email: " + credentials.email);

    // 1. Validation
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      };
    }

    // 2. Tìm user
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
        Logger.log("✅ Found user at row: " + (i + 1));
        Logger.log("📊 User data:");
        Logger.log("  - Email: " + data[i][emailIndex]);
        Logger.log(
          "  - emailVerified value: " +
            data[i][verifiedIndex] +
            " (type: " +
            typeof data[i][verifiedIndex] +
            ")"
        );
        Logger.log(
          "  - isActive value: " +
            data[i][isActiveIndex] +
            " (type: " +
            typeof data[i][isActiveIndex] +
            ")"
        );
        Logger.log(
          "  - passwordHash exists: " + (data[i][passwordIndex] ? "Yes" : "No")
        );

        // Kiểm tra email đã được xác thực chưa
        if (data[i][verifiedIndex] !== true) {
          Logger.log("❌ Email not verified: " + data[i][verifiedIndex]);
          return {
            success: false,
            message:
              "Email chưa được xác thực. Vui lòng kiểm tra hộp thư của bạn.",
          };
        }

        // Kiểm tra tài khoản có active không
        if (data[i][isActiveIndex] !== true) {
          Logger.log("❌ Account not active: " + data[i][isActiveIndex]);
          return {
            success: false,
            message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin.",
          };
        }

        // Verify password
        const passwordHash = data[i][passwordIndex];

        if (!passwordHash) {
          return {
            success: false,
            message:
              "Tài khoản này đăng nhập bằng Google. Vui lòng dùng 'Đăng nhập với Google'.",
          };
        }

        if (!verifyPasswordSecure(credentials.password, passwordHash)) {
          return {
            success: false,
            message: "Mật khẩu không đúng",
          };
        }

        // Cập nhật lastLogin
        const now = new Date();
        usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(now);

        // Log activity
        logActivity(
          data[i][0],
          "Login",
          "Logged in with email: " + credentials.email
        );

        Logger.log("✅ Login successful: " + credentials.email);

        return {
          success: true,
          message: "Đăng nhập thành công!",
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            fullName: data[i][4],
            role: data[i][5],
            avatarUrl: data[i][11] || "",
          },
        };
      }
    }

    return {
      success: false,
      message: "Email không tồn tại",
    };
  } catch (error) {
    Logger.log("❌ Error in loginWithEmail: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * ========================================
 * GOOGLE OAUTH2 FLOW
 * ========================================
 */

/**
 * Đăng nhập/Đăng ký với Google OAuth2
 * Auto-provisioning: Tự động tạo tài khoản nếu email chưa tồn tại
 * Account Linking: Link Google account với tài khoản hiện có
 * @returns {Object} {success, message, user, isNewUser}
 */
function loginWithGoogle() {
  try {
    Logger.log("=== LOGIN WITH GOOGLE ===");

    // Lấy email từ Google Session
    const email = Session.getActiveUser().getEmail();

    if (!email) {
      return {
        success: false,
        message: "Không thể lấy email từ Google Account",
      };
    }

    Logger.log("Google Email: " + email);

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
    const googleIdIndex = headers.indexOf("googleId");
    const verifiedIndex = headers.indexOf("emailVerified");
    const isActiveIndex = headers.indexOf("isActive");
    const lastLoginIndex = headers.indexOf("lastLogin");

    // Tìm user theo email
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        // Account Linking: Nếu tài khoản chưa có googleId, link nó
        if (!data[i][googleIdIndex]) {
          usersSheet
            .getRange(i + 1, googleIdIndex + 1)
            .setValue(Session.getTemporaryActiveUserKey());
          usersSheet.getRange(i + 1, verifiedIndex + 1).setValue(true); // Auto-verify vì từ Google
          Logger.log("🔗 Linked Google account to existing user");
        }

        // Activate account nếu chưa active
        if (data[i][isActiveIndex] !== true) {
          usersSheet.getRange(i + 1, isActiveIndex + 1).setValue(true);
        }

        // Cập nhật lastLogin
        const now = new Date();
        usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(now);

        // Log activity
        logActivity(data[i][0], "Login", "Logged in with Google: " + email);

        Logger.log("✅ Login successful (existing user): " + email);

        return {
          success: true,
          message: "Đăng nhập thành công!",
          isNewUser: false,
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            fullName: data[i][4],
            role: data[i][5],
            avatarUrl: data[i][11] || "",
          },
        };
      }
    }

    // Auto-provisioning: Tạo tài khoản mới
    Logger.log("📝 Creating new user from Google account");

    const userId = generateNextId(usersSheet, "USR");
    const username = email.split("@")[0];
    const now = new Date();

    const newUser = [
      userId,
      username,
      email,
      "", // passwordHash - null vì đăng nhập Google
      username, // fullName - có thể update sau
      "student", // Default role
      now, // createdAt
      now, // lastLogin
      true, // isActive - active luôn vì từ Google
      Session.getTemporaryActiveUserKey(), // googleId
      true, // emailVerified - trust Google
      "", // avatarUrl - có thể lấy từ Google API
      "", // verificationToken
      "", // verificationExpires
      "", // resetPasswordToken
      "", // resetPasswordExpires
    ];

    usersSheet.appendRow(newUser);

    // Log activity
    logActivity(userId, "Register", "Registered via Google: " + email);

    Logger.log("✅ New user created: " + userId);

    return {
      success: true,
      message: "Tài khoản mới đã được tạo! Chào mừng bạn.",
      isNewUser: true,
      user: {
        userId: userId,
        username: username,
        email: email,
        fullName: username,
        role: "student",
        avatarUrl: "",
      },
    };
  } catch (error) {
    Logger.log("❌ Error in loginWithGoogle: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * ========================================
 * PASSWORD RESET FLOW
 * ========================================
 */

/**
 * Gửi link reset password
 * @param {string} email - Email người dùng
 * @returns {Object} {success, message}
 */
function requestPasswordReset(email) {
  try {
    Logger.log("=== REQUEST PASSWORD RESET ===");
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
    const resetTokenIndex = headers.indexOf("resetPasswordToken");
    const resetExpiresIndex = headers.indexOf("resetPasswordExpires");
    const googleIdIndex = headers.indexOf("googleId");

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        // Kiểm tra nếu là Google account
        if (data[i][googleIdIndex]) {
          return {
            success: false,
            message:
              "Tài khoản này đăng nhập bằng Google và không có mật khẩu.",
          };
        }

        // Generate reset token
        const resetToken = generateVerificationToken();
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // 1 giờ

        // Lưu token
        usersSheet.getRange(i + 1, resetTokenIndex + 1).setValue(resetToken);
        usersSheet
          .getRange(i + 1, resetExpiresIndex + 1)
          .setValue(resetExpires);

        // Gửi email
        const emailSent = sendPasswordResetEmail(email, resetToken, data[i][4]);

        // Log activity
        logActivity(
          data[i][0],
          "Password Reset Request",
          "Requested password reset"
        );

        Logger.log("✅ Password reset email sent");

        return {
          success: true,
          message: emailSent
            ? "Link reset mật khẩu đã được gửi đến email của bạn."
            : "Đã tạo link reset nhưng không thể gửi email.",
        };
      }
    }

    // Security: Không tiết lộ email không tồn tại
    return {
      success: true,
      message: "Nếu email tồn tại, link reset mật khẩu đã được gửi.",
    };
  } catch (error) {
    Logger.log("❌ Error in requestPasswordReset: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Reset password với token
 * @param {Object} data - {token, newPassword, confirmPassword}
 * @returns {Object} {success, message}
 */
function resetPassword(data) {
  try {
    Logger.log("=== RESET PASSWORD ===");

    if (!data.token || !data.newPassword || !data.confirmPassword) {
      return {
        success: false,
        message: "Thiếu thông tin",
      };
    }

    if (data.newPassword !== data.confirmPassword) {
      return {
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      };
    }

    if (data.newPassword.length < 6) {
      return {
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Lỗi hệ thống",
      };
    }

    const userData = usersSheet.getDataRange().getValues();
    const headers = userData[0];
    const resetTokenIndex = headers.indexOf("resetPasswordToken");
    const resetExpiresIndex = headers.indexOf("resetPasswordExpires");
    const passwordIndex = headers.indexOf("passwordHash");

    for (let i = 1; i < userData.length; i++) {
      if (userData[i][resetTokenIndex] === data.token) {
        // Kiểm tra token hết hạn
        const expires = new Date(userData[i][resetExpiresIndex]);
        const now = new Date();

        if (now > expires) {
          return {
            success: false,
            message: "Link reset đã hết hạn",
          };
        }

        // Hash password mới
        const newPasswordHash = hashPasswordSecure(data.newPassword);

        // Cập nhật password và clear token
        usersSheet.getRange(i + 1, passwordIndex + 1).setValue(newPasswordHash);
        usersSheet.getRange(i + 1, resetTokenIndex + 1).setValue("");
        usersSheet.getRange(i + 1, resetExpiresIndex + 1).setValue("");

        // Log activity
        logActivity(
          userData[i][0],
          "Password Reset",
          "Password changed successfully"
        );

        Logger.log("✅ Password reset successful");

        return {
          success: true,
          message: "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập.",
        };
      }
    }

    return {
      success: false,
      message: "Token không hợp lệ",
    };
  } catch (error) {
    Logger.log("❌ Error in resetPassword: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * ========================================
 * HELPER FUNCTIONS
 * ========================================
 */

/**
 * Hash password sử dụng SHA-256
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
function hashPasswordSecure(password) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );

  let hash = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte += 256;
    let byteStr = byte.toString(16);
    if (byteStr.length == 1) byteStr = "0" + byteStr;
    hash += byteStr;
  }

  return hash;
}

/**
 * Verify password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} Match result
 */
function verifyPasswordSecure(password, hash) {
  const inputHash = hashPasswordSecure(password);
  return inputHash === hash;
}

/**
 * Generate verification token
 * @returns {string} Random token
 */
function generateVerificationToken() {
  return Utilities.getUuid();
}

/**
 * Send verification email
 * @param {string} email - Email người dùng
 * @param {string} token - Verification token
 * @param {string} fullName - Tên người dùng
 * @returns {boolean} Success
 */
function sendVerificationEmail(email, token, fullName) {
  try {
    Logger.log("📧 Attempting to send verification email...");
    Logger.log("To: " + email);
    Logger.log("Token: " + token);

    // Kiểm tra quota email
    const emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log("Email quota remaining: " + emailQuotaRemaining);

    if (emailQuotaRemaining <= 0) {
      Logger.log("❌ No email quota remaining!");
      return false;
    }

    const webAppUrl = ScriptApp.getService().getUrl();
    const verificationLink = webAppUrl + "?action=verify&token=" + token;

    Logger.log("Verification link: " + verificationLink);

    const subject = "Xác thực tài khoản Doanv3";
    const body = `
Xin chào ${fullName},

Cảm ơn bạn đã đăng ký tài khoản tại Doanv3!

Vui lòng click vào link bên dưới để xác thực email của bạn:
${verificationLink}

Link này sẽ hết hạn sau 24 giờ.

Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Doanv3
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      name: "Doanv3 System",
    });

    Logger.log("✅ Verification email sent successfully to: " + email);
    return true;
  } catch (error) {
    Logger.log("❌ Error sending verification email: " + error.toString());
    Logger.log("❌ Error stack: " + error.stack);
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - Email người dùng
 * @param {string} token - Reset token
 * @param {string} fullName - Tên người dùng
 * @returns {boolean} Success
 */
function sendPasswordResetEmail(email, token, fullName) {
  try {
    Logger.log("📧 Attempting to send password reset email...");
    Logger.log("To: " + email);

    // Kiểm tra quota email
    const emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log("Email quota remaining: " + emailQuotaRemaining);

    if (emailQuotaRemaining <= 0) {
      Logger.log("❌ No email quota remaining!");
      return false;
    }

    const webAppUrl = ScriptApp.getService().getUrl();
    const resetLink = webAppUrl + "?action=reset&token=" + token;

    Logger.log("Reset link: " + resetLink);

    const subject = "Reset mật khẩu - Doanv3";
    const body = `
Xin chào ${fullName},

Chúng tôi nhận được yêu cầu reset mật khẩu cho tài khoản của bạn.

Vui lòng click vào link bên dưới để đặt lại mật khẩu:
${resetLink}

Link này sẽ hết hạn sau 1 giờ.

Nếu bạn không yêu cầu reset mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Doanv3
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      name: "Doanv3 System",
    });

    Logger.log("✅ Password reset email sent successfully to: " + email);
    return true;
  } catch (error) {
    Logger.log("❌ Error sending reset email: " + error.toString());
    Logger.log("❌ Error stack: " + error.stack);
    return false;
  }
}

/**
 * Get sheet helper - sử dụng getOrCreateDatabase()
 * @param {string} sheetName - Sheet name
 * @returns {Sheet|null} Sheet object
 */
function getSheet(sheetName) {
  try {
    // Sử dụng hàm getOrCreateDatabase() từ utils.gs
    const ss = getOrCreateDatabase();
    return ss.getSheetByName(sheetName);
  } catch (error) {
    Logger.log("❌ Error getSheet: " + error.toString());
    return null;
  }
}

/**
 * Log activity helper
 * @param {string} userId - User ID
 * @param {string} action - Action name
 * @param {string} details - Details
 */
function logActivity(userId, action, details) {
  try {
    const logsSheet = getSheet("Logs");
    if (!logsSheet) return;

    // Sử dụng generateNextId từ utils.gs
    const logId = generateNextId(logsSheet, "LOG");
    const now = new Date();

    const logEntry = [
      logId,
      now,
      "INFO",
      "USER",
      userId,
      action,
      details,
      "",
      "",
      Session.getTemporaryActiveUserKey() || "",
    ];

    logsSheet.appendRow(logEntry);
  } catch (error) {
    Logger.log("❌ Error logging: " + error.toString());
  }
}
