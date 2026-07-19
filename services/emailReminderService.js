// ========================================
// STUDY REMINDER EMAIL SERVICE
// ========================================

const STUDY_REMINDER_TEMPLATE_KEY = "STUDY_REMINDER_EMAIL_TEMPLATE_V1";
const STUDY_REMINDER_SENT_PREFIX = "STUDY_REMINDER_SENT_";
const STUDY_REMINDER_TIMEZONE = "Asia/Ho_Chi_Minh";

const STUDY_REMINDER_TEMPLATE_SOURCE = "STUDY_REMINDER_TEMPLATE_SOURCE";
const STUDY_REMINDER_GMAIL_DRAFT_ID = "STUDY_REMINDER_GMAIL_DRAFT_ID";
const STUDY_REMINDER_GMAIL_DRAFT_SUBJECT_CACHE = "STUDY_REMINDER_GMAIL_DRAFT_SUBJECT_CACHE";
const STUDY_REMINDER_GMAIL_DRAFT_BODY_CACHE = "STUDY_REMINDER_GMAIL_DRAFT_BODY_CACHE";
const STUDY_REMINDER_GMAIL_DRAFT_SELECTED_AT = "STUDY_REMINDER_GMAIL_DRAFT_SELECTED_AT";

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
    const source = props.getProperty(STUDY_REMINDER_TEMPLATE_SOURCE);

    if (source === "gmail_draft") {
      const draftId = props.getProperty(STUDY_REMINDER_GMAIL_DRAFT_ID);
      let subject = props.getProperty(STUDY_REMINDER_GMAIL_DRAFT_SUBJECT_CACHE) || "";
      let body = props.getProperty(STUDY_REMINDER_GMAIL_DRAFT_BODY_CACHE) || "";
      let fromCache = true;

      if (draftId) {
        try {
          const draft = GmailApp.getDraft(draftId);
          if (draft) {
            const message = draft.getMessage();
            subject = message.getSubject() || subject;
            body = message.getBody() || body;
            fromCache = false;
          }
        } catch (e) {
          Logger.log("Error reading Gmail Draft " + draftId + ", fallback to cache: " + e.toString());
        }
      }

      return {
        success: true,
        subject: subject,
        body: body,
        source: "gmail_draft",
        fromCache: fromCache
      };
    }

    const raw = props.getProperty(STUDY_REMINDER_TEMPLATE_KEY);

    if (!raw) {
      const def = getDefaultStudyReminderTemplate_();
      props.setProperty(STUDY_REMINDER_TEMPLATE_KEY, JSON.stringify(def));
      return {
        success: true,
        subject: def.subject,
        body: def.body,
        source: "default"
      };
    }

    const parsed = JSON.parse(raw);
    return {
      success: true,
      subject: parsed.subject || "",
      body: parsed.body || "",
      source: "custom"
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

    const props = PropertiesService.getScriptProperties();
    props.setProperty(
      STUDY_REMINDER_TEMPLATE_KEY,
      JSON.stringify({
        subject: subject,
        body: body,
        updatedAt: new Date().toISOString()
      })
    );
    props.deleteProperty(STUDY_REMINDER_TEMPLATE_SOURCE);

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

// Đã chuyển các hàm Gmail Drafts vào auth/emailService.js để dùng chung cho mọi loại email.

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

function parseStudyBoolean_(value, fallback) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }
  if (value === true || value === false) {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return fallback;
}

function normalizeReminderDaysForEmail_(value) {
  if (value === "" || value === null || value === undefined) {
    return [1, 2, 3, 4, 5, 6, 0];
  }

  let arr = [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed !== null && parsed !== undefined) {
      arr = [parsed];
    }
  } catch (e) {
    arr = String(value).split(",");
  }

  const map = {};
  arr.forEach(function (item) {
    const day = parseInt(item, 10);
    if (isNaN(day) || day < 0 || day > 6) return;
    map[day] = true;
  });

  const out = Object.keys(map).map(function (key) {
    return parseInt(key, 10);
  });
  return out.length ? out : [1, 2, 3, 4, 5, 6, 0];
}

function normalizeAllowedReminderInteger_(value, allowedValues, fallback) {
  const parsed = parseStudyNumber_(value, fallback);
  return allowedValues.indexOf(parsed) !== -1 ? parsed : fallback;
}

function buildStudyReminderInitialKey_(todayKey, email, reminderTime) {
  return (
    STUDY_REMINDER_SENT_PREFIX +
    todayKey +
    "_" +
    email +
    "_" +
    reminderTime +
    "_initial"
  );
}

function buildStudyReminderRepeatKey_(todayKey, email, reminderTime, repeatIndex) {
  return (
    STUDY_REMINDER_SENT_PREFIX +
    todayKey +
    "_" +
    email +
    "_" +
    reminderTime +
    "_repeat_" +
    repeatIndex
  );
}

function countSentRepeatsForSlot_(props, todayKey, email, reminderTime, repeatMaxPerDay) {
  let count = 0;
  for (let i = 1; i <= repeatMaxPerDay; i++) {
    const key = buildStudyReminderRepeatKey_(todayKey, email, reminderTime, i);
    const val = props.getProperty(key);
    if (val && String(val).indexOf("SENT_") === 0) {
      count = i;
    }
  }
  return count;
}

function extractSentAtFromAttemptFlag_(flagValue) {
  const text = String(flagValue || "").trim();
  if (text.indexOf("SENT_") !== 0) return null;
  const iso = text.substring(5);
  if (!iso) return null;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;
  return dt;
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

function isStudyReminderDueWithLead_(reminderTime, reminderDays, leadMinutes, now) {
  const parts = String(reminderTime || "").trim().split(":");
  if (parts.length !== 2) return false;
  
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return false;

  // Thuật toán: thời điểm lý tưởng gửi email là EventTime - leadMinutes.
  // cron job chạy mỗi 5 phút, ta cho phép trễ 15 phút.
  // => Email Send Time <= now <= Email Send Time + 15 mins
  // => EventTime - leadMinutes <= now <= EventTime - leadMinutes + 15 mins
  // => EventTime <= now + leadMinutes <= EventTime + 15 mins
  
  const nowPlusLead = new Date(now.getTime() + leadMinutes * 60000);
  
  // Tạo các ứng viên EventTime (hôm qua, hôm nay, ngày mai) để bao quát trường hợp qua nửa đêm
  const eventTimeToday = new Date(nowPlusLead.getTime());
  eventTimeToday.setHours(h, m, 0, 0);
  
  const eventTimeYesterday = new Date(eventTimeToday.getTime() - 24 * 3600000);
  const eventTimeTomorrow = new Date(eventTimeToday.getTime() + 24 * 3600000);
  
  const candidates = [eventTimeYesterday, eventTimeToday, eventTimeTomorrow];
  
  for (let i = 0; i < candidates.length; i++) {
    const candidateEvent = candidates[i];
    
    // Kiểm tra xem ngày của Candidate Event có nằm trong danh sách nhắc nhở không
    if (!reminderDays.includes(candidateEvent.getDay())) continue;
    
    // Tính khoảng cách thời gian (phút)
    const diffMs = nowPlusLead.getTime() - candidateEvent.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    // Nếu nowPlusLead đang nằm trong khoảng từ [candidateEvent, candidateEvent + 15 phút]
    if (diffMins >= 0 && diffMins <= 15) {
      return true;
    }
  }
  
  return false;
}

function getInitialReminderSlotInfo_(reminderTime, reminderDays, leadMinutes, now) {
  const parts = String(reminderTime || "").trim().split(":");
  if (parts.length !== 2) {
    return { due: false, eventTime: null, sendTime: null };
  }

  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return { due: false, eventTime: null, sendTime: null };
  }

  const safeLead = Math.max(0, parseStudyNumber_(leadMinutes, 10));
  const nowPlusLead = new Date(now.getTime() + safeLead * 60000);
  const eventToday = new Date(nowPlusLead.getTime());
  eventToday.setHours(h, m, 0, 0);

  const candidates = [
    new Date(eventToday.getTime() - 24 * 3600000),
    eventToday,
    new Date(eventToday.getTime() + 24 * 3600000)
  ];

  for (let i = 0; i < candidates.length; i++) {
    const candidateEvent = candidates[i];
    if (!reminderDays.includes(candidateEvent.getDay())) continue;

    const sendTime = new Date(candidateEvent.getTime() - safeLead * 60000);
    const diffMins = Math.floor((now.getTime() - sendTime.getTime()) / 60000);
    if (diffMins >= 0 && diffMins <= 15) {
      return {
        due: true,
        eventTime: candidateEvent,
        sendTime: sendTime
      };
    }
  }

  return { due: false, eventTime: null, sendTime: null };
}

function applyReminderUrgencyByMode_(rendered, reminderMode, sendType, repeatIndex) {
  if (Number(reminderMode || 1) !== 3 || sendType !== "repeat") {
    return rendered;
  }

  const level = Number(repeatIndex || 1);
  let prefix = "[Nhắc lại] ";
  if (level >= 3) {
    prefix = "[Khẩn cấp] ";
  } else if (level >= 2) {
    prefix = "[Quan trọng] ";
  }

  let footer =
    '<p style="margin-top:12px;color:#b45309;"><b>Nhắc lại:</b> Bạn vẫn chưa hoàn thành mục tiêu học hôm nay.</p>';
  if (level >= 3) {
    footer =
      '<p style="margin-top:12px;color:#b91c1c;"><b>Khẩn cấp:</b> Bạn sắp bỏ lỡ mục tiêu học hôm nay. Hãy bắt đầu ngay bây giờ.</p>';
  }

  return {
    subject: prefix + String(rendered.subject || ""),
    body: String(rendered.body || "") + footer
  };
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
    if (typeof getUserStreakData === "function") {
      const res = getUserStreakData({ email: email });
      if (res && res.success) {
        streak = Number(res.currentStreak || 0);
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

  return {
    completedLessons: completedLessons,
    remainingLessons: Math.max(0, dailyGoal - completedLessons),
    dailyGoal: dailyGoal,
    streak: streak
  };
}

function isStudyGoalCompleted_(stats) {
  return (
    Number(stats.completedLessons || 0) >= Number(stats.dailyGoal || 5)
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
  const emailReminderEnabledCol = col("emailReminderEnabled");
  const reminderTimesCol = col("reminderTimes");
  const reminderDaysCol = col("reminderDays");
  const reminderLeadMinutesCol = col("reminderLeadMinutes");
  const repeatIfMissedCol = col("repeatIfMissed");
  const repeatIntervalMinutesCol = col("repeatIntervalMinutes");
  const repeatMaxPerDayCol = col("repeatMaxPerDay");
  const smartReminderEnabledCol = col("smartReminderEnabled");
  const autoRetryIfMissedCol = col("autoRetryIfMissed");
  const retryIntervalCol = col("retryInterval");
  const maxRetriesCol = col("maxRetries");
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

    const reminderDays = normalizeReminderDaysForEmail_(
      reminderDaysCol !== -1 ? row[reminderDaysCol] : null
    );

    const reminderLeadMinutes =
      reminderLeadMinutesCol !== -1
        ? parseStudyNumber_(row[reminderLeadMinutesCol], 10)
        : 10;

    const repeatIfMissedRaw =
      repeatIfMissedCol !== -1
        ? row[repeatIfMissedCol]
        : autoRetryIfMissedCol !== -1
          ? row[autoRetryIfMissedCol]
          : false;

    const repeatIntervalRaw =
      repeatIntervalMinutesCol !== -1
        ? row[repeatIntervalMinutesCol]
        : retryIntervalCol !== -1
          ? row[retryIntervalCol]
          : 30;

    const repeatMaxRaw =
      repeatMaxPerDayCol !== -1
        ? row[repeatMaxPerDayCol]
        : maxRetriesCol !== -1
          ? row[maxRetriesCol]
          : 3;

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
        emailReminderEnabled: enabled,
        reminderTimes: reminderTimes,
        reminderDays: reminderDays,
        reminderLeadMinutes: reminderLeadMinutes,
        repeatIfMissed: parseStudyBoolean_(repeatIfMissedRaw, false),
        repeatIntervalMinutes: normalizeAllowedReminderInteger_(repeatIntervalRaw, [15, 30, 45, 60], 30),
        repeatMaxPerDay: normalizeAllowedReminderInteger_(repeatMaxRaw, [1, 2, 3, 5], 3),
        smartReminderEnabled:
          smartReminderEnabledCol !== -1
            ? parseStudyBoolean_(row[smartReminderEnabledCol], true)
            : true,
        reminderMode:
          reminderModeCol !== -1 ? parseStudyNumber_(row[reminderModeCol], 2) : 2
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
  const sentInThisRun = {};

  users.forEach(function (user) {
    Logger.log("Checking user: " + user.email + " settings=" + JSON.stringify(user.settings));

    const times = user.settings.reminderTimes || [];
    const reminderDays = user.settings.reminderDays || [1, 2, 3, 4, 5, 6, 0];
    const leadMinutes = parseStudyNumber_(user.settings.reminderLeadMinutes, 10);
    const smartReminderEnabled = user.settings.smartReminderEnabled !== false;
    const reminderModeRaw = parseStudyNumber_(user.settings.reminderMode, 2);
    const reminderMode = [1, 2, 3].indexOf(reminderModeRaw) >= 0 ? reminderModeRaw : 2;

    times.forEach(function (time) {
      const slotInfo = getInitialReminderSlotInfo_(time, reminderDays, leadMinutes, now);
      const due = slotInfo.due;
      const repeatIfMissed = user.settings.repeatIfMissed === true && reminderMode !== 1 && smartReminderEnabled;
      const repeatIntervalMinutes = normalizeAllowedReminderInteger_(
        user.settings.repeatIntervalMinutes,
        [15, 30, 45, 60],
        30
      );
      const repeatMaxPerDay = normalizeAllowedReminderInteger_(
        user.settings.repeatMaxPerDay,
        [1, 2, 3, 5],
        3
      );
      const initialKey = buildStudyReminderInitialKey_(todayKey, user.email, time);
      const initialValue = props.getProperty(initialKey);
      const hasInitialSent = !!(initialValue && String(initialValue).indexOf("SENT_") === 0);
      const sentRepeats = countSentRepeatsForSlot_(props, todayKey, user.email, time, repeatMaxPerDay);

      Logger.log("Time check: " + user.email + " time=" + time + " due=" + due);

      const stats = getTodayStudyReminderStats_(user.email, user.settings);
      const completed = isStudyGoalCompleted_(stats);

      if (completed) {
        skippedCount++;
        return;
      }

      let sendType = "";
      let repeatIndex = 0;
      let sentKey = "";

      if (!hasInitialSent) {
        if (!due) {
          skippedCount++;
          return;
        }
        sendType = "initial";
        sentKey = initialKey;
      } else {
        if (!repeatIfMissed) {
          skippedCount++;
          return;
        }

        if (sentRepeats >= repeatMaxPerDay) {
          skippedCount++;
          return;
        }

        const initialSentAt = extractSentAtFromAttemptFlag_(initialValue);
        if (!initialSentAt) {
          skippedCount++;
          return;
        }

        repeatIndex = sentRepeats + 1;
        const repeatDueAt = new Date(
          initialSentAt.getTime() + repeatIndex * repeatIntervalMinutes * 60000
        );
        if (now.getTime() < repeatDueAt.getTime()) {
          skippedCount++;
          return;
        }

        sendType = "repeat";
        sentKey = buildStudyReminderRepeatKey_(todayKey, user.email, time, repeatIndex);
      }

      if (sentInThisRun[sentKey]) {
        skippedCount++;
        return;
      }

      if (props.getProperty(sentKey)) {
        Logger.log("Already sent today: " + sentKey);
        skippedCount++;
        return;
      }

      const renderedBase = renderStudyReminderTemplate_(
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
          streak: stats.streak,
          todayDate: Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy"),
          learningUrl: buildLearningUrl_()
        }
      );

      const rendered = applyReminderUrgencyByMode_(
        renderedBase,
        reminderMode,
        sendType,
        repeatIndex
      );

      const quota = MailApp.getRemainingDailyQuota();
      if (quota <= 0) {
        Logger.log("Hết hạn mức gửi email (Quota). Không thể gửi cho " + user.email);
        return;
      }

      MailApp.sendEmail({
        to: user.email,
        subject: rendered.subject,
        htmlBody: rendered.body,
        name: "TERRACODE"
      });

      sentInThisRun[sentKey] = true;
      props.setProperty(sentKey, "SENT_" + new Date().toISOString());
      sentCount++;

      Logger.log(
        "Sent reminder to: " +
          user.email +
          " time=" +
          time +
          " type=" +
          sendType +
          (repeatIndex ? " repeat=" + repeatIndex : "")
      );
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

function authorizeGmailDraftAccess() {
  const drafts = GmailApp.getDrafts();
  const quota = MailApp.getRemainingDailyQuota();

  Logger.log("Authorized Gmail Draft access.");
  Logger.log("Draft count: " + drafts.length);
  Logger.log("Remaining mail quota: " + quota);

  return {
    success: true,
    draftCount: drafts.length,
    quota: quota,
    email: Session.getActiveUser().getEmail()
  };
}

