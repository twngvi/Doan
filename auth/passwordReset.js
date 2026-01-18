/**
 * passwordReset.js - Password Reset Functions
 *
 * Chứa các hàm reset password
 */

/**
 * Request password reset
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

    // For password reset, we'll reuse verificationToken columns
    const resetTokenIndex = headers.indexOf("verificationToken");
    const resetExpiresIndex = headers.indexOf("verificationExpires");

    for (let i = 1; i < data.length; i++) {
      if (
        data[i][emailIndex] &&
        data[i][emailIndex].toLowerCase() === email.toLowerCase()
      ) {
        Logger.log("User found at row " + (i + 1));

        // Generate 6-digit code
        const resetCode = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1);

        Logger.log("Generated reset code: " + resetCode);

        usersSheet.getRange(i + 1, resetTokenIndex + 1).setValue(resetCode);
        usersSheet
          .getRange(i + 1, resetExpiresIndex + 1)
          .setValue(resetExpires);

        Logger.log("Code saved to database");

        const emailSent = sendPasswordResetCodeEmail(
          email,
          resetCode,
          data[i][1] || "User"
        );

        logActivity({
          level: "INFO",
          category: "USER",
          userId: data[i][0],
          action: "PASSWORD_RESET_REQUEST",
          details: "Requested password reset",
        });

        return {
          success: true,
          message: emailSent
            ? "Mã xác thực đã được gửi đến email của bạn."
            : "Mã xác thực đã được tạo nhưng không thể gửi email.",
        };
      }
    }

    Logger.log("Email not found: " + email);
    return {
      success: false,
      message: "Email không tồn tại trong hệ thống",
    };
  } catch (error) {
    Logger.log("Error in requestPasswordReset: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Reset password with code (Internal)
 */
function resetPasswordWithCodeInternal(data) {
  try {
    Logger.log("=== RESET PASSWORD WITH CODE ===");
    Logger.log("Email: " + data.email);

    if (
      !data.email ||
      !data.code ||
      !data.newPassword ||
      !data.confirmPassword
    ) {
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

    if (!/^\d{6}$/.test(data.code)) {
      return {
        success: false,
        message: "Mã xác thực không hợp lệ",
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
    const emailIndex = headers.indexOf("email");
    const resetTokenIndex = headers.indexOf("verificationToken");
    const resetExpiresIndex = headers.indexOf("verificationExpires");
    const passwordIndex = headers.indexOf("passwordHash");

    for (let i = 1; i < userData.length; i++) {
      if (
        userData[i][emailIndex] &&
        userData[i][emailIndex].toLowerCase() === data.email.toLowerCase()
      ) {
        const storedCode = String(userData[i][resetTokenIndex]).trim();
        const inputCode = String(data.code).trim();

        Logger.log("Stored code: " + storedCode);
        Logger.log("Input code: " + inputCode);

        if (storedCode !== inputCode) {
          Logger.log("Code mismatch!");
          return {
            success: false,
            message: "Mã xác thực không đúng",
          };
        }

        Logger.log("Code matched!");

        const expires = new Date(userData[i][resetExpiresIndex]);
        const now = new Date();

        if (now > expires) {
          return {
            success: false,
            message: "Mã xác thực đã hết hạn",
          };
        }

        const newPasswordHash = hashPassword(data.newPassword);

        usersSheet.getRange(i + 1, passwordIndex + 1).setValue(newPasswordHash);
        usersSheet.getRange(i + 1, resetTokenIndex + 1).setValue("");
        usersSheet.getRange(i + 1, resetExpiresIndex + 1).setValue("");

        logActivity({
          level: "INFO",
          category: "USER",
          userId: userData[i][0],
          action: "PASSWORD_RESET",
          details: "Password reset successfully",
        });

        Logger.log("Password reset successful");

        return {
          success: true,
          message: "Mật khẩu đã được đặt lại thành công!",
        };
      }
    }

    return {
      success: false,
      message: "Email không tồn tại",
    };
  } catch (error) {
    Logger.log("Error in resetPasswordWithCode: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
