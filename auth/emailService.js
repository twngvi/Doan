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

/**
 * Send study reminder email
 * @param {string} email
 * @param {Object} info - { fullName, mode, remainingLessons, completedLessons, totalLessons, streak, nextTopics }
 */
function sendStudyReminder(email, info) {
  try {
    const emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    if (emailQuotaRemaining <= 0) return false;

    let subject = "";
    let body = "";

    if (info.mode === "escalating_final") {
       subject = `⚠️ Cảnh báo: Sắp đứt chuỗi Streak ${info.streak} ngày!`;
       body = `
Chào ${info.fullName},

Chỉ còn vài giờ nữa là kết thúc ngày học hôm nay. Bạn hiện tại đã học được ${info.completedLessons}/${info.totalLessons} bài học.
Hãy hoàn thành ${info.remainingLessons} bài nữa để duy trì streak ${info.streak} ngày liên tiếp của bạn nhé!

Các bài tiếp theo:
${info.nextTopics.map(t => "- " + t).join("\\n")}

Vào học ngay để không bỏ lỡ phần thưởng!
`;
    } else {
       subject = `Hôm nay bạn còn ${info.remainingLessons} bài chưa hoàn thành`;
       body = `
Xin chào ${info.fullName},

Bạn đã hoàn thành ${info.completedLessons}/${info.totalLessons} bài học hôm nay.
Các bài còn lại trong mục tiêu ngày của bạn:
${info.nextTopics.map(t => "- " + t).join("\\n")}

Hoàn thành mục tiêu để duy trì streak học tập nhé.

Trân trọng,
Đội ngũ Doanv3
`;
    }

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      name: "Doanv3 Study Reminder"
    });
    return true;
  } catch (error) {
    Logger.log("Error sending study reminder email: " + error.toString());
    return false;
  }
}

/**
 * Cron Job function for sending hourly reminders.
 * Should be triggered every hour using Apps Script Time-Driven Triggers.
 */
function cronJobReminders() {
   Logger.log("Running hourly cron job for study reminders...");
   // Implementation would scan Users sheet, check current time vs reminderTimes,
   // then calculate remaining lessons and call sendStudyReminder() if goals are not met.
}
