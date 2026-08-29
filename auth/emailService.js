/**
 * emailService.js - Email Sending & Admin Functions
 *
 * Chứa các hàm gửi email: verification, password reset, study reminder
 * và API quản lý mẫu email (Template) bằng Gmail Drafts cho Admin.
 */

const EMAIL_TYPE_CONFIG = {
  verification: {
    prefix: "[TERRACODE_VERIFY]",
    name: "Email xác thực tài khoản",
    defaultSubject: "Mã xác thực tài khoản - TerraCode",
    defaultBody: "Xin chào {{fullName}},\n\nCảm ơn bạn đã đăng ký tài khoản tại TerraCode!\n\nMã xác thực của bạn là: {{code}}\n\nVui lòng nhập mã này vào trang xác thực để kích hoạt tài khoản.\nMã này sẽ hết hạn sau 24 giờ.\n\nTrân trọng,\nĐội ngũ TerraCode",
    demoVars: {
      "{{fullName}}": "Test User",
      "{{userName}}": "Test User",
      "{{email}}": "test@example.com",
      "{{code}}": "123456"
    }
  },
  password_reset: {
    prefix: "[TERRACODE_RESET]",
    name: "Email quên mật khẩu",
    defaultSubject: "Mã xác thực reset mật khẩu - TerraCode",
    defaultBody: "Xin chào {{fullName}},\n\nChúng tôi nhận được yêu cầu reset mật khẩu cho tài khoản của bạn.\n\nMã xác thực của bạn là: {{code}}\n\nMã này sẽ hết hạn sau 1 giờ.\n\nTrân trọng,\nĐội ngũ TerraCode",
    demoVars: {
      "{{fullName}}": "Test User",
      "{{userName}}": "Test User",
      "{{email}}": "test@example.com",
      "{{code}}": "654321"
    }
  },
  study_reminder: {
    prefix: "[TERRACODE_REMINDER]",
    name: "Email nhắc học",
    defaultSubject: "⏰ Đến giờ học rồi, {{userName}}!",
    defaultBody: "Xin chào {{userName}},\n\nHôm nay là {{todayDate}}. Bạn đã hoàn thành {{completedLessons}}/{{dailyGoal}} bài học.\nCòn {{remainingLessons}} bài nữa là đạt mục tiêu.\n\nVào học ngay: {{learningUrl}}",
    demoVars: {
      "{{userName}}": "Test User",
      "{{fullName}}": "Test User",
      "{{email}}": "test@example.com",
      "{{dailyGoal}}": "5",
      "{{completedLessons}}": "3",
      "{{remainingLessons}}": "2",
      "{{streak}}": "5",
      "{{todayDate}}": "24/06/2026",
      "{{learningUrl}}": "https://example.com/learning"
    }
  }
};

/**
 * ========================================================================
 * 1. ADMIN API FUNCTIONS (Được gọi từ email_management_scripts.html)
 * ========================================================================
 */

function adminGetEmailTemplateStatus(type) {
  try {
    const props = PropertiesService.getScriptProperties();
    const draftId = props.getProperty(`GMAIL_DRAFT_ID_${type}`);
    if (draftId) {
      return { success: true, source: 'gmail_draft' };
    }
    return { success: true, source: 'default' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function adminCreateStarterDraft(type) {
  try {
    if (typeof checkAdminRole === "function" && !checkAdminRole()) {
      return { success: false, message: "Không có quyền truy cập" };
    }
    const config = EMAIL_TYPE_CONFIG[type];
    if (!config) return { success: false, message: "Loại email không hợp lệ" };

    const subject = `${config.prefix} ${config.defaultSubject}`;
    const htmlBody = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
      <h2 style="color: #1a73e8;">Mẫu ${config.name}</h2>
      <p>${config.defaultBody.replace(/\n/g, '<br>')}</p>
      <br>
      <p style="font-size: 12px; color: #777;">Email được gửi tự động từ hệ thống.</p>
    </div>`;

    GmailApp.createDraft("", subject, "", { htmlBody: htmlBody });

    return {
      success: true,
      message: "Đã tạo một thư nháp mẫu vào hộp thư Gmail của bạn."
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function adminListEmailDrafts(type) {
  try {
    if (typeof checkAdminRole === "function" && !checkAdminRole()) {
      return { success: false, message: "Không có quyền truy cập" };
    }
    const config = EMAIL_TYPE_CONFIG[type];
    if (!config) return { success: false, message: "Loại email không hợp lệ" };

    const drafts = GmailApp.getDrafts();
    const result = [];

    drafts.forEach(function (draft) {
      const msg = draft.getMessage();
      const subject = msg.getSubject() || "";

      if (subject.indexOf(config.prefix) !== -1) {
        result.push({
          id: draft.getId(),
          subject: subject,
          preview: msg.getPlainBody().substring(0, 100) + "..."
        });
      }
    });

    return { success: true, drafts: result };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function adminPreviewDraft(draftId, type) {
  try {
    if (typeof checkAdminRole === "function" && !checkAdminRole()) {
      return { success: false, message: "Không có quyền truy cập" };
    }
    if (!draftId) return { success: false, message: "Thiếu draftId" };

    const config = EMAIL_TYPE_CONFIG[type];
    const draft = GmailApp.getDraft(draftId);
    if (!draft) return { success: false, message: "Không tìm thấy bản nháp" };

    const msg = draft.getMessage();
    let subject = msg.getSubject() || "";
    let body = msg.getBody() || "";

    // Bỏ prefix
    subject = subject.replace(config.prefix, "").trim();

    // Replace biến demo
    for (const [key, value] of Object.entries(config.demoVars)) {
      subject = subject.split(key).join(value);
      body = body.split(key).join(value);
    }

    return { success: true, subject: subject, body: body };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function adminSaveDraftTemplate(draftId, type) {
  try {
    if (typeof checkAdminRole === "function" && !checkAdminRole()) {
      return { success: false, message: "Không có quyền truy cập" };
    }
    if (!draftId) return { success: false, message: "Thiếu draftId" };

    const config = EMAIL_TYPE_CONFIG[type];
    const draft = GmailApp.getDraft(draftId);
    if (!draft) return { success: false, message: "Không tìm thấy bản nháp" };

    const msg = draft.getMessage();
    let subject = msg.getSubject() || "";
    const body = msg.getBody() || "";

    if (subject.indexOf(config.prefix) === -1) {
      return { success: false, message: `Tiêu đề bản nháp phải chứa ${config.prefix}` };
    }

    subject = subject.replace(config.prefix, "").trim();

    const props = PropertiesService.getScriptProperties();
    props.setProperty(`GMAIL_DRAFT_ID_${type}`, draftId);
    props.setProperty(`GMAIL_DRAFT_SUBJECT_${type}`, subject);
    props.setProperty(`GMAIL_DRAFT_BODY_${type}`, body);
    props.setProperty(`GMAIL_DRAFT_UPDATED_${type}`, new Date().toISOString());

    return { success: true, message: "Đã lưu bản nháp Gmail làm mẫu chính thức" };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function adminTestSendEmail(type) {
  try {
    if (typeof checkAdminRole === "function" && !checkAdminRole()) {
      return { success: false, message: "Không có quyền truy cập" };
    }
    const userEmail = Session.getActiveUser().getEmail();
    const config = EMAIL_TYPE_CONFIG[type];

    const template = getTemplateForSending(type, config.demoVars);

    MailApp.sendEmail({
      to: userEmail,
      subject: "[TEST] " + template.subject,
      htmlBody: template.htmlBody,
      body: template.body, // Plain text fallback
      name: "TERRACODE System"
    });

    return { success: true, message: "Đã gửi email test tới " + userEmail };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ========================================================================
 * 2. CORE EMAIL SENDING LOGIC
 * ========================================================================
 */

/**
 * Helper: Đọc template từ ScriptProperties (ưu tiên cao nhất) hoặc mặc định
 * Thực hiện replace các biến
 */
function getTemplateForSending(type, replacements) {
  const config = EMAIL_TYPE_CONFIG[type];
  let subject = config.defaultSubject;
  let body = config.defaultBody;
  let htmlBody = null;

  try {
    const props = PropertiesService.getScriptProperties();
    const savedSubject = props.getProperty(`GMAIL_DRAFT_SUBJECT_${type}`);
    const savedBody = props.getProperty(`GMAIL_DRAFT_BODY_${type}`);

    if (savedSubject && savedBody) {
      subject = savedSubject;
      htmlBody = savedBody; // Body lấy từ draft là HTML
    }
  } catch (e) {
    Logger.log("Lỗi đọc template từ Properties: " + e.toString());
  }

  // Thay thế biến
  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.split(key).join(value);
      body = body.split(key).join(value);
      if (htmlBody) {
        htmlBody = htmlBody.split(key).join(value);
      }
    }
  }

  return { subject, body, htmlBody };
}

/**
 * Gửi email xác thực
 */
function sendVerificationEmail(email, code, fullName) {
  try {
    const template = getTemplateForSending('verification', {
      "{{fullName}}": fullName,
      "{{userName}}": fullName,
      "{{username}}": fullName,
      "{{displayName}}": fullName,
      "{{code}}": code,
      "{{email}}": email
    });

    const options = {
      to: email,
      subject: template.subject,
      body: template.body,
      name: "TerraCode System"
    };

    if (template.htmlBody) options.htmlBody = template.htmlBody;

    MailApp.sendEmail(options);
    return true;
  } catch (error) {
    Logger.log("Lỗi gửi sendVerificationEmail: " + error.toString());
    return false;
  }
}

/**
 * Gửi email reset mật khẩu
 */
function sendPasswordResetCodeEmail(email, code, fullName) {
  try {
    const template = getTemplateForSending('password_reset', {
      "{{fullName}}": fullName,
      "{{userName}}": fullName,
      "{{username}}": fullName,
      "{{displayName}}": fullName,
      "{{code}}": code,
      "{{email}}": email
    });

    const options = {
      to: email,
      subject: template.subject,
      body: template.body,
      name: "TerraCode System"
    };

    if (template.htmlBody) options.htmlBody = template.htmlBody;

    MailApp.sendEmail(options);
    return true;
  } catch (error) {
    Logger.log("Lỗi gửi sendPasswordResetCodeEmail: " + error.toString());
    return false;
  }
}

/**
 * Gửi email nhắc học tập
 */
function sendStudyReminder(email, info) {
  try {
    let modeSubject = "";
    let modeBody = "";

    if (info.mode === "escalating_final") {
      modeSubject = `⚠️ Cảnh báo: Sắp đứt chuỗi Streak ${info.streak} ngày!`;
      modeBody = `Chào ${info.fullName},\n\nChỉ còn vài giờ nữa là kết thúc ngày học hôm nay. Bạn hiện tại đã học được ${info.completedLessons}/${info.totalLessons} bài học.\nHãy hoàn thành ${info.remainingLessons} bài nữa để duy trì streak ${info.streak} ngày liên tiếp của bạn nhé!\n\nVào học ngay để không bỏ lỡ phần thưởng!`;
    }

    const template = getTemplateForSending('study_reminder', {
      "{{userName}}": info.fullName || "bạn",
      "{{displayName}}": info.fullName || "bạn",
      "{{email}}": email,
      "{{dailyGoal}}": info.dailyGoal || 5,
      "{{completedLessons}}": info.completedLessons || 0,
      "{{remainingLessons}}": info.remainingLessons || 5,
      "{{streak}}": info.streak || 0,
      "{{todayDate}}": Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy"),
      "{{learningUrl}}": "https://script.google.com/.../exec"
    });

    // Ưu tiên nội dung tuỳ chỉnh của mode nếu chưa có draft, nếu có draft thì gửi theo draft
    if (info.mode === "escalating_final" && !template.htmlBody) {
      template.subject = modeSubject;
      template.body = modeBody;
    }

    const options = {
      to: email,
      subject: template.subject,
      body: template.body,
      name: "TerraCode System"
    };

    if (template.htmlBody) options.htmlBody = template.htmlBody;

    MailApp.sendEmail(options);
    return true;
  } catch (error) {
    Logger.log("Lỗi gửi sendStudyReminder: " + error.toString());
    return false;
  }
}

function cronJobReminders() {
  Logger.log("Running hourly cron job for study reminders...");
}
