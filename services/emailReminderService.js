// ========================================
// STUDY REMINDER EMAIL SERVICE
// ========================================

const STUDY_REMINDER_TEMPLATE_KEY = "STUDY_REMINDER_EMAIL_TEMPLATE_V1";
const STUDY_REMINDER_SENT_PREFIX = "STUDY_REMINDER_SENT_";
const STUDY_REMINDER_TIMEZONE = "Asia/Ho_Chi_Minh";

function getDefaultStudyReminderTemplate_() {
  return {
    subject: "⏰ Đến giờ học rồi, {{userName}}!",
    body:
      '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">' +
      '<h2>Xin chào {{userName}},</h2>' +
      '<p>Đây là email nhắc nhở học tập hôm nay của bạn.</p>' +
      '<ul>' +
      '<li>Mục tiêu bài học: <b>{{dailyGoal}}</b> bài</li>' +
      '<li>Đã hoàn thành: <b>{{completedLessons}}</b> bài</li>' +
      '<li>Còn lại: <b>{{remainingLessons}}</b> bài</li>' +
      '<li>Mục tiêu thời gian: <b>{{dailyTimeGoal}}</b> phút</li>' +
      '<li>Đã học: <b>{{studiedMinutes}}</b> phút</li>' +
      '<li>Chuỗi hiện tại: <b>{{streak}}</b> ngày</li>' +
      '</ul>' +
      '<p><a href="{{learningUrl}}" style="display:inline-block;background:#2f6b3f;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Vào học ngay</a></p>' +
      '<p style="font-size:12px;color:#6b7280;">Ngày: {{todayDate}}</p>' +
      '</div>'
  };
}

function getStudyReminderEmailTemplate() {
  try {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(STUDY_REMINDER_TEMPLATE_KEY);

    if (!raw) {
      const def = getDefaultStudyReminderTemplate_();
      props.setProperty(STUDY_REMINDER_TEMPLATE_KEY, JSON.stringify(def));
      return {
        success: true,
        subject: def.subject,
        body: def.body
      };
    }

    const parsed = JSON.parse(raw);
    return {
      success: true,
      subject: parsed.subject || "",
      body: parsed.body || ""
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

function saveStudyReminderEmailTemplate(payload) {
  try {
    if (typeof checkAdminRole === "function" && !checkAdminRole()) {
      return {
        success: false,
        message: "Không có quyền truy cập"
      };
    }
    payload = payload || {};
    const subject = String(payload.subject || "").trim();
    const body = String(payload.body || "").trim();

    if (!subject || !body) {
      return {
        success: false,
        message: "Thiếu tiêu đề hoặc nội dung email"
      };
    }

    PropertiesService.getScriptProperties().setProperty(
      STUDY_REMINDER_TEMPLATE_KEY,
      JSON.stringify({
        subject: subject,
        body: body,
        updatedAt: new Date().toISOString()
      })
    );

    return {
      success: true,
      message: "Đã lưu template email"
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

function normalizeReminderTimesForEmail_(value) {
  if (!value) return [];

  let arr = [];

  if (Array.isArray(value)) {
    arr = value;
  } else if (value instanceof Date) {
    try {
      const timeStr = Utilities.formatDate(value, "Asia/Ho_Chi_Minh", "HH:mm");
      arr = [timeStr];
    } catch (e) {
      arr = [String(value)];
    }
  } else {
    const text = String(value).trim();

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else {
        arr = [String(parsed)];
      }
    } catch (e) {
      arr = text.split(",");
    }
  }

  return arr
    .map(function (item) {
      return String(item || "").trim();
    })
    .filter(function (item) {
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(item);
    });
}

function parseStudyNumber_(val, fallback) {
  if (val === "" || val === null || val === undefined) {
    return fallback;
  }
  if (val instanceof Date) {
    const epoch = new Date(1899, 11, 30);
    const diffMs = val.getTime() - epoch.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.round(diffDays);
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function isReminderTimeDue_(reminderTime, now) {
  const nowHour = Number(Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "H"));
  const nowMinute = Number(Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "m"));
  const nowTotal = nowHour * 60 + nowMinute;

  const parts = String(reminderTime || "").trim().split(":");
  if (parts.length !== 2) return false;

  const reminderHour = Number(parts[0]);
  const reminderMinute = Number(parts[1]);

  if (
    isNaN(reminderHour) ||
    isNaN(reminderMinute) ||
    reminderHour < 0 ||
    reminderHour > 23 ||
    reminderMinute < 0 ||
    reminderMinute > 59
  ) {
    return false;
  }

  const reminderTotal = reminderHour * 60 + reminderMinute;
  const diff = nowTotal - reminderTotal;

  // Cho phép trigger trễ tối đa 15 phút.
  return diff >= 0 && diff <= 15;
}

function renderStudyReminderTemplate_(template, vars) {
  let subject = String(template.subject || "");
  let body = String(template.body || "");

  Object.keys(vars).forEach(function (key) {
    const regex = new RegExp("\\{\\{" + key + "\\}\\}", "g");
    subject = subject.replace(regex, String(vars[key] ?? ""));
    body = body.replace(regex, String(vars[key] ?? ""));
  });

  return {
    subject: subject,
    body: body
  };
}

function getTodayStudyReminderStats_(email, settings) {
  let studiedMinutes = 0;
  let completedLessons = 0;
  let streak = 0;

  try {
    if (typeof getTodayLearningStats === "function") {
      const res = getTodayLearningStats({ email: email });
      if (res && res.success) {
        studiedMinutes = Number(res.dailyTotal || res.studiedMinutesToday || 0);
        streak = Number(res.currentStreak || res.streak || 0);
      }
    }
  } catch (e) {}

  try {
    if (typeof generateTimeline === "function") {
      const timelineRes = generateTimeline({ email: email });
      if (
        timelineRes &&
        timelineRes.success &&
        timelineRes.timeline &&
        timelineRes.timeline.today
      ) {
        completedLessons = Number(timelineRes.timeline.today.completed || 0);
      }
    }
  } catch (e) {}

  const dailyGoal = Number(settings.dailyGoal || 5);
  const dailyTimeGoal = Number(settings.dailyTimeGoal || 15);

  return {
    studiedMinutes: studiedMinutes,
    completedLessons: completedLessons,
    remainingLessons: Math.max(0, dailyGoal - completedLessons),
    dailyGoal: dailyGoal,
    dailyTimeGoal: dailyTimeGoal,
    streak: streak
  };
}

function isStudyGoalCompleted_(stats) {
  return (
    Number(stats.completedLessons || 0) >= Number(stats.dailyGoal || 5) ||
    Number(stats.studiedMinutes || 0) >= Number(stats.dailyTimeGoal || 15)
  );
}

function buildLearningUrl_() {
  try {
    const url = ScriptApp.getService().getUrl();
    if (url) return url + "?page=dashboard";
  } catch (e) {}

  return "";
}

function getAllStudyReminderUsers_() {
  const ss = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Users");

  if (!sheet) {
    throw new Error("Không tìm thấy sheet Users");
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(function (h) {
    return String(h || "").trim();
  });

  function col(name) {
    return headers.indexOf(name);
  }

  const emailCol = col("email");
  const displayNameCol = col("displayName");
  const fullNameCol = col("fullName");
  const usernameCol = col("username");
  const dailyGoalCol = col("dailyGoal");
  const dailyTimeGoalCol = col("dailyTimeGoal");
  const emailReminderEnabledCol = col("emailReminderEnabled");
  const reminderTimesCol = col("reminderTimes");
  const reminderModeCol = col("reminderMode");

  if (emailCol === -1) {
    throw new Error("Sheet Users thiếu cột email");
  }

  const users = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = String(row[emailCol] || "").trim().toLowerCase();

    if (!email) continue;

    const enabledRaw =
      emailReminderEnabledCol !== -1 ? row[emailReminderEnabledCol] : false;

    const enabled =
      enabledRaw === true ||
      String(enabledRaw).trim().toLowerCase() === "true";

    if (!enabled) continue;

    const reminderTimes =
      reminderTimesCol !== -1
        ? normalizeReminderTimesForEmail_(row[reminderTimesCol])
        : [];

    if (!reminderTimes.length) continue;

    users.push({
      rowNumber: i + 1,
      email: email,
      displayName:
        (displayNameCol !== -1 && row[displayNameCol]) ||
        (fullNameCol !== -1 && row[fullNameCol]) ||
        (usernameCol !== -1 && row[usernameCol]) ||
        email,
      settings: {
        dailyGoal:
          dailyGoalCol !== -1 ? parseStudyNumber_(row[dailyGoalCol], 5) : 5,
        dailyTimeGoal:
          dailyTimeGoalCol !== -1 ? parseStudyNumber_(row[dailyTimeGoalCol], 15) : 15,
        emailReminderEnabled: enabled,
        reminderTimes: reminderTimes,
        reminderMode:
          reminderModeCol !== -1 ? parseStudyNumber_(row[reminderModeCol], 1) : 1
      }
    });
  }

  return users;
}

function processStudyReminderEmails() {
  const now = new Date();
  const todayKey = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
  const nowText = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss");

  Logger.log("===== processStudyReminderEmails START " + nowText + " =====");

  const props = PropertiesService.getScriptProperties();
  const templateRes = getStudyReminderEmailTemplate();

  if (!templateRes || !templateRes.success) {
    Logger.log("Không tải được template email: " + JSON.stringify(templateRes));
    return;
  }

  const users = getAllStudyReminderUsers_();

  Logger.log("Reminder users found: " + users.length);

  let sentCount = 0;
  let skippedCount = 0;

  users.forEach(function (user) {
    Logger.log("Checking user: " + user.email + " settings=" + JSON.stringify(user.settings));

    const times = user.settings.reminderTimes || [];

    times.forEach(function (time) {
      const due = isReminderTimeDue_(time, now);

      Logger.log("Time check: " + user.email + " time=" + time + " due=" + due);

      if (!due) {
        skippedCount++;
        return;
      }

      const sentKey =
        "STUDY_REMINDER_SENT_" +
        todayKey +
        "_" +
        user.email +
        "_" +
        time;

      if (props.getProperty(sentKey)) {
        Logger.log("Already sent today: " + sentKey);
        skippedCount++;
        return;
      }

      const stats = getTodayStudyReminderStats_(user.email, user.settings);
      const completed = isStudyGoalCompleted_(stats);
      const mode = Number(user.settings.reminderMode || 1);

      // Mode 2 và 3: nếu đã hoàn thành mục tiêu thì không gửi nữa.
      if ((mode === 2 || mode === 3) && completed) {
        props.setProperty(sentKey, "SKIPPED_COMPLETED_" + new Date().toISOString());
        skippedCount++;
        return;
      }

      const rendered = renderStudyReminderTemplate_(
        {
          subject: templateRes.subject,
          body: templateRes.body
        },
        {
          userName: user.displayName,
          displayName: user.displayName,
          email: user.email,
          dailyGoal: stats.dailyGoal,
          completedLessons: stats.completedLessons,
          remainingLessons: stats.remainingLessons,
          dailyTimeGoal: stats.dailyTimeGoal,
          studiedMinutes: stats.studiedMinutes,
          streak: stats.streak,
          todayDate: Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy"),
          learningUrl: buildLearningUrl_()
        }
      );

      MailApp.sendEmail({
        to: user.email,
        subject: rendered.subject,
        htmlBody: rendered.body,
        name: "TERRACODE"
      });

      props.setProperty(sentKey, "SENT_" + new Date().toISOString());
      sentCount++;

      Logger.log("Sent reminder to: " + user.email);
    });
  });

  Logger.log("Study reminder result: sent=" + sentCount + ", skipped=" + skippedCount);
  Logger.log("===== processStudyReminderEmails END =====");
}

function installStudyReminderTrigger() {
  const handler = "processStudyReminderEmails";

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(5)
    .create();

  return {
    success: true,
    message: "Đã cài trigger gửi email nhắc học mỗi 5 phút"
  };
}

function testSendStudyReminderEmailToMe() {
  if (typeof checkAdminRole === "function" && !checkAdminRole()) {
    return {
      success: false,
      message: "Không có quyền truy cập"
    };
  }

  const email = Session.getActiveUser().getEmail();

  if (!email) {
    throw new Error("Không lấy được email tài khoản đang chạy script");
  }

  const template = getStudyReminderEmailTemplate();
  const rendered = renderStudyReminderTemplate_(
    {
      subject: template.subject,
      body: template.body
    },
    {
      userName: "Test User",
      displayName: "Test User",
      email: email,
      dailyGoal: 10,
      completedLessons: 0,
      remainingLessons: 10,
      dailyTimeGoal: 55,
      studiedMinutes: 0,
      streak: 1,
      todayDate: Utilities.formatDate(new Date(), STUDY_REMINDER_TIMEZONE, "dd/MM/yyyy"),
      learningUrl: buildLearningUrl_()
    }
  );

  MailApp.sendEmail({
    to: email,
    subject: "[TEST] " + rendered.subject,
    htmlBody: rendered.body,
    name: "TERRACODE"
  });

  return {
    success: true,
    message: "Đã gửi email test tới " + email
  };
}

function debugStudyReminderForCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  const settingsRes = getStudySettings({ email: email });

  const now = new Date();
  const nowText = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM/yyyy");

  let dueResults = [];

  if (settingsRes && settingsRes.success && settingsRes.settings) {
    const times = settingsRes.settings.reminderTimes || [];

    dueResults = times.map(function (time) {
      return {
        time: time,
        isDueNow: isReminderTimeDue_(time, now)
      };
    });
  }

  throw new Error(JSON.stringify({
    currentEmail: email,
    nowVN: nowText,
    settingsResult: settingsRes,
    dueResults: dueResults,
    triggers: ScriptApp.getProjectTriggers().map(function (t) {
      return {
        handler: t.getHandlerFunction(),
        eventType: String(t.getEventType())
      };
    })
  }, null, 2));
}

function testSendReminderToUserEmail() {
  const userEmail = "ttvdoan112233@gmail.com"; // đổi đúng email user của bạn

  const settingsRes = getStudySettings({ email: userEmail });

  if (!settingsRes || !settingsRes.success) {
    throw new Error("Không lấy được settings: " + JSON.stringify(settingsRes));
  }

  const templateRes = getStudyReminderEmailTemplate();

  if (!templateRes || !templateRes.success) {
    throw new Error("Không lấy được template: " + JSON.stringify(templateRes));
  }

  const stats = getTodayStudyReminderStats_(userEmail, settingsRes.settings);

  const rendered = renderStudyReminderTemplate_(
    {
      subject: templateRes.subject,
      body: templateRes.body
    },
    {
      userName: "Trường Tường Vi",
      displayName: "Trường Tường Vi",
      email: userEmail,
      dailyGoal: stats.dailyGoal,
      completedLessons: stats.completedLessons,
      remainingLessons: stats.remainingLessons,
      dailyTimeGoal: stats.dailyTimeGoal,
      studiedMinutes: stats.studiedMinutes,
      streak: stats.streak,
      todayDate: Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy"),
      learningUrl: buildLearningUrl_()
    }
  );

  MailApp.sendEmail({
    to: userEmail,
    subject: "[TEST USER] " + rendered.subject,
    htmlBody: rendered.body,
    name: "TERRACODE"
  });

  return {
    success: true,
    message: "Đã gửi email test tới " + userEmail,
    settings: settingsRes.settings
  };
}

function debugClearTodaySentFlags() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys();
  let clearedCount = 0;
  keys.forEach(function (key) {
    if (key.indexOf("STUDY_REMINDER_SENT_") === 0) {
      props.deleteProperty(key);
      clearedCount++;
    }
  });
  return {
    success: true,
    message: "Đã xóa " + clearedCount + " sent flags để bạn test lại."
  };
}
