const STUDY_CALENDAR_SHEET_NAME = "StudyCalendarLogs";

function getStudyCalendarSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(STUDY_CALENDAR_SHEET_NAME);

  const headers = [
    "id",
    "userId",
    "email",
    "date",
    "year",
    "month",
    "studyMinutes",
    "lessonCount",
    "activityCount",
    "goalMinutes",
    "goalLessons",
    "status",
    "lastActivityAt",
    "createdAt",
    "updatedAt",
    "source",
    "theoryCount",
    "quizCount",
    "matchingCount"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(STUDY_CALENDAR_SHEET_NAME);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0];

  headers.forEach(function(header, index) {
    if (currentHeaders[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });

  return sheet;
}

function getStudyCalendarHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach(function(h, i) {
    map[String(h).trim()] = i;
  });
  return map;
}

function normalizeStudyCalendarDate_(dateInput) {
  if (!dateInput) {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  if (Object.prototype.toString.call(dateInput) === "[object Date]") {
    return Utilities.formatDate(dateInput, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  const text = String(dateInput).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const d = new Date(text);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function getStudyCalendarStatus_(studyMinutes, lessonCount, goalMinutes, goalLessons) {
  studyMinutes = Number(studyMinutes || 0);
  lessonCount = Number(lessonCount || 0);
  goalMinutes = Number(goalMinutes || 0);
  goalLessons = Number(goalLessons || 0);

  // Nếu mục tiêu bài học là 0 (chưa cài đặt), mặc định là 1 bài học để tính toán đúng
  if (goalLessons === 0) {
    goalLessons = 1;
  }

  if (
    (goalMinutes > 0 && studyMinutes >= goalMinutes) ||
    (goalLessons > 0 && lessonCount >= goalLessons)
  ) {
    return "success";
  }

  if (studyMinutes > 0 || lessonCount > 0) {
    return "warning";
  }

  return "none";
}

/**
 * Tính số bài học hoàn thành được thêm vào từ lần ghi nhận này.
 * Mỗi khi tổng đủ bộ 3 loại (lý thuyết + quiz + matching) thì tính +1 bài.
 * Không yêu cầu chung topic, chỉ cần đủ 3 loại cộng dồn trong ngày.
 *
 * @param {number} oldTheory   - số lần lý thuyết trước đó trong ngày
 * @param {number} oldQuiz     - số lần quiz trước đó trong ngày
 * @param {number} oldMatching - số lần matching trước đó trong ngày
 * @param {number} addTheory   - lần lý thuyết thêm mới
 * @param {number} addQuiz     - lần quiz thêm mới
 * @param {number} addMatching - lần matching thêm mới
 * @returns {{newTheory, newQuiz, newMatching, completedLessons}}
 */
function calcLessonCompletions_(oldTheory, oldQuiz, oldMatching, addTheory, addQuiz, addMatching) {
  var theory   = (Number(oldTheory)   || 0) + (Number(addTheory)   || 0);
  var quiz     = (Number(oldQuiz)     || 0) + (Number(addQuiz)     || 0);
  var matching = (Number(oldMatching) || 0) + (Number(addMatching) || 0);

  // Mỗi bộ đầy đủ 3 loại = 1 bài học hoàn thành
  var completedLessons = Math.min(theory, quiz, matching);

  // Trừ đi số bộ đã hoàn thành khỏi từng counter
  theory   -= completedLessons;
  quiz     -= completedLessons;
  matching -= completedLessons;

  return {
    newTheory: theory,
    newQuiz: quiz,
    newMatching: matching,
    completedLessons: completedLessons
  };
}

function apiRecordStudyCalendarDay(payload) {
  payload = payload || {};

  const userId = String(payload.userId || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();

  if (!userId && !email) {
    return {
      success: false,
      message: "Thiếu userId hoặc email"
    };
  }

  const date = normalizeStudyCalendarDate_(payload.date);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));

  const addMinutes = Math.max(0, Number(payload.studyMinutes || payload.minutes || 0));
  const addActivities = Math.max(1, Number(payload.activityCount || 1));

  const goalMinutes = Math.max(0, Number(payload.goalMinutes || 0));
  const goalLessons = Math.max(0, Number(payload.goalLessons || 0));
  const source = String(payload.source || "learning").trim();

  // Xác định loại hoạt động từ source
  const addTheory   = (source === "lesson" || source === "flashcard" || source === "mindmap") ? 1 : 0;
  const addQuiz     = (source === "quiz")     ? 1 : 0;
  const addMatching = (source === "matching") ? 1 : 0;

  const sheet = getStudyCalendarSheet_();
  const map = getStudyCalendarHeaderMap_(sheet);
  const lastRow = sheet.getLastRow();
  const now = new Date();

  let targetRow = -1;

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    for (let i = 0; i < values.length; i++) {
      const row = values[i];

      const rowUserId = String(row[map.userId] || "").trim();
      const rowEmail = String(row[map.email] || "").trim().toLowerCase();
      const rowDate = normalizeStudyCalendarDate_(row[map.date]);

      const sameUser =
        (userId && rowUserId === userId) ||
        (email && rowEmail === email);

      if (sameUser && rowDate === date) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow === -1) {
    // Hàng mới — tính bộ hoàn thành từ các counter bắt đầu từ 0
    const calc = calcLessonCompletions_(0, 0, 0, addTheory, addQuiz, addMatching);
    const completedLessons = calc.completedLessons;

    const status = getStudyCalendarStatus_(
      addMinutes,
      completedLessons,
      goalMinutes,
      goalLessons
    );

    const row = [];
    row[map.id] = "SC_" + Utilities.getUuid().replace(/-/g, "").slice(0, 18);
    row[map.userId] = userId;
    row[map.email] = email;
    row[map.date] = date;
    row[map.year] = year;
    row[map.month] = month;
    row[map.studyMinutes] = addMinutes;
    row[map.lessonCount] = completedLessons;
    row[map.activityCount] = addActivities;
    row[map.goalMinutes] = goalMinutes;
    row[map.goalLessons] = goalLessons;
    row[map.status] = status;
    row[map.lastActivityAt] = now;
    row[map.createdAt] = now;
    row[map.updatedAt] = now;
    row[map.source] = source;
    // Lưu counter còn dư sau khi tính bộ hoàn thành
    if (map.theoryCount !== undefined)   row[map.theoryCount]   = calc.newTheory;
    if (map.quizCount !== undefined)     row[map.quizCount]     = calc.newQuiz;
    if (map.matchingCount !== undefined) row[map.matchingCount] = calc.newMatching;

    sheet.appendRow(row);

    return {
      success: true,
      created: true,
      date: date,
      status: status,
      completedLessons: completedLessons
    };
  }

  // Cập nhật hàng hiện có
  const rowValues = sheet
    .getRange(targetRow, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  const oldMinutes    = Number(rowValues[map.studyMinutes]  || 0);
  const oldLessons    = Number(rowValues[map.lessonCount]   || 0);
  const oldActivities = Number(rowValues[map.activityCount] || 0);
  const oldTheory     = map.theoryCount   !== undefined ? Number(rowValues[map.theoryCount]   || 0) : 0;
  const oldQuiz       = map.quizCount     !== undefined ? Number(rowValues[map.quizCount]     || 0) : 0;
  const oldMatching   = map.matchingCount !== undefined ? Number(rowValues[map.matchingCount] || 0) : 0;

  const calc = calcLessonCompletions_(oldTheory, oldQuiz, oldMatching, addTheory, addQuiz, addMatching);
  const completedLessons = calc.completedLessons;

  const newMinutes    = oldMinutes + addMinutes;
  const newLessons    = oldLessons + completedLessons;
  const newActivities = oldActivities + addActivities;

  const finalGoalMinutes = goalMinutes || Number(rowValues[map.goalMinutes] || 0);
  const finalGoalLessons = goalLessons || Number(rowValues[map.goalLessons] || 0);

  const status = getStudyCalendarStatus_(
    newMinutes,
    newLessons,
    finalGoalMinutes,
    finalGoalLessons
  );

  sheet.getRange(targetRow, map.studyMinutes  + 1).setValue(newMinutes);
  sheet.getRange(targetRow, map.lessonCount   + 1).setValue(newLessons);
  sheet.getRange(targetRow, map.activityCount + 1).setValue(newActivities);
  sheet.getRange(targetRow, map.goalMinutes   + 1).setValue(finalGoalMinutes);
  sheet.getRange(targetRow, map.goalLessons   + 1).setValue(finalGoalLessons);
  sheet.getRange(targetRow, map.status        + 1).setValue(status);
  sheet.getRange(targetRow, map.lastActivityAt + 1).setValue(now);
  sheet.getRange(targetRow, map.updatedAt     + 1).setValue(now);
  sheet.getRange(targetRow, map.source        + 1).setValue(source);

  // Cập nhật counter từng loại (phần dư)
  if (map.theoryCount   !== undefined) sheet.getRange(targetRow, map.theoryCount   + 1).setValue(calc.newTheory);
  if (map.quizCount     !== undefined) sheet.getRange(targetRow, map.quizCount     + 1).setValue(calc.newQuiz);
  if (map.matchingCount !== undefined) sheet.getRange(targetRow, map.matchingCount + 1).setValue(calc.newMatching);

  return {
    success: true,
    created: false,
    date: date,
    status: status,
    completedLessons: completedLessons
  };
}



function apiGetStudyCalendarMonth(payload) {
  payload = payload || {};

  const userId = String(payload.userId || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const year = Number(payload.year);
  const month = Number(payload.month);

  if (!userId && !email) {
    return {
      success: false,
      message: "Thiếu userId hoặc email",
      days: []
    };
  }

  if (!year || !month) {
    return {
      success: false,
      message: "Thiếu năm hoặc tháng",
      days: []
    };
  }

  const sheet = getStudyCalendarSheet_();
  const map = getStudyCalendarHeaderMap_(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {
      success: true,
      days: []
    };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const days = values
    .filter(function(row) {
      const rowUserId = String(row[map.userId] || "").trim();
      const rowEmail = String(row[map.email] || "").trim().toLowerCase();
      const rowYear = Number(row[map.year]);
      const rowMonth = Number(row[map.month]);

      const sameUser =
        (userId && rowUserId === userId) ||
        (email && rowEmail === email);

      return sameUser && rowYear === year && rowMonth === month;
    })
    .map(function(row) {
      return {
        date: normalizeStudyCalendarDate_(row[map.date]),
        year: Number(row[map.year] || year),
        month: Number(row[map.month] || month),
        studyMinutes: Number(row[map.studyMinutes] || 0),
        lessonCount: Number(row[map.lessonCount] || 0),
        activityCount: Number(row[map.activityCount] || 0),
        goalMinutes: Number(row[map.goalMinutes] || 0),
        goalLessons: Number(row[map.goalLessons] || 0),
        status: String(row[map.status] || "none"),
        lastActivityAt: row[map.lastActivityAt] ? String(row[map.lastActivityAt]) : ""
      };
    });

  return {
    success: true,
    year: year,
    month: month,
    days: days
  };
}
