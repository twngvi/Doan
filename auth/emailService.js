/**
 * emailService.js - Email Sending Functions 
 *
 * Chứa các hàm gửi email: verification, password reset
 */

/**
 * Send verification email with OTP code
 */
function sendVerificationEmail(email, code, fullName) {
  try {
    Logger.log("Sending verification email...");
    Logger.log("To: " + email);
    Logger.log("Code: " + code);

    const emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log("Email quota remaining: " + emailQuotaRemaining);

    if (emailQuotaRemaining <= 0) {
      Logger.log("No email quota remaining!");
      return false;
    }

    const subject = "Mã xác thực tài khoản - Doanv3";
    const body = `
Xin chào ${fullName},

Cảm ơn bạn đã đăng ký tài khoản tại Doanv3!

Mã xác thực của bạn là:

    ${code}

Vui lòng nhập mã này vào trang xác thực để kích hoạt tài khoản.

Mã này sẽ hết hạn sau 24 giờ.

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

    Logger.log("Verification email sent successfully to: " + email);
    return true;
  } catch (error) {
    Logger.log("Error sending verification email: " + error.toString());
    Logger.log("Error stack: " + error.stack);
    return false;
  }
}

/**
 * Send password reset code email
 */
function sendPasswordResetCodeEmail(email, code, fullName) {
  try {
    Logger.log("Sending password reset code email...");

    const emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log("Email quota remaining: " + emailQuotaRemaining);

    if (emailQuotaRemaining <= 0) {
      Logger.log("No email quota remaining!");
      return false;
    }

    const subject = "Mã xác thực reset mật khẩu - Doanv3";
    const body = `
Xin chào ${fullName},

Chúng tôi nhận được yêu cầu reset mật khẩu cho tài khoản của bạn.

Mã xác thực của bạn là:

    ${code}

Mã này sẽ hết hạn sau 1 giờ.

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

    Logger.log("Password reset code email sent successfully");
    return true;
  } catch (error) {
    Logger.log("Error sending reset code email: " + error.toString());
    return false;
  }
}
