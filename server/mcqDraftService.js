/**
 * MCQ Draft Service - Handles cross-device draft syncing to Google Sheets (Personal DB)
 */

const MCQ_DRAFT_SHEET_NAME = "MCQ_Drafts";
const MCQ_DRAFT_CHUNK_SIZE = 45000;
const MCQ_DRAFT_MAX_CHUNKS = 12;
const MCQ_DRAFT_TOMBSTONE_KEEP_DAYS = 30;

function getMCQDraftSpreadsheet_(email) {
  let targetEmail = email;
  if (!targetEmail) {
    try {
      targetEmail = Session.getActiveUser().getEmail();
    } catch (e) {}
  }
  if (!targetEmail) {
    return null;
  }
  if (typeof getUserProgressSheetIdByEmail !== "function") {
    return null;
  }
  const progressSheetId = getUserProgressSheetIdByEmail(targetEmail);
  if (!progressSheetId) {
    return null;
  }
  try {
    return SpreadsheetApp.openById(progressSheetId);
  } catch (e) {
    return null;
  }
}

function ensureMCQDraftSheet_(email) {
  const ss = getMCQDraftSpreadsheet_(email);
  if (!ss) return null;

  let sheet = ss.getSheetByName(MCQ_DRAFT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(MCQ_DRAFT_SHEET_NAME);
  }

  const headers = [
    "DraftKey",
    "UserId",
    "Email",
    "TopicId",
    "TopicTitle",
    "ContentDocId",
    "QuizMode",
    "AttemptId",
    "Status",
    "SavedAt",
    "UpdatedAt",
    "CompletedAt",
    "CompletedResultId"
  ];

  for (let i = 1; i <= MCQ_DRAFT_MAX_CHUNKS; i++) {
    headers.push("Json" + i);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every(function (cell) {
    return cell === "";
  });

  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getMCQDraftColumnMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};

  headers.forEach(function (header, index) {
    const name = String(header || "").trim();
    if (name) {
      map[name] = index + 1;
    }
  });

  return map;
}

function getMCQDraftCellDate_(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function normalizeMCQDraftKeyPart_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function buildMCQDraftKey_(userId, email, topicId, quizMode) {
  const userPart = normalizeMCQDraftKeyPart_(userId || email);
  const topicPart = normalizeMCQDraftKeyPart_(topicId);
  const modePart = normalizeMCQDraftKeyPart_(quizMode || "instant");

  return ["mcq", userPart, topicPart, modePart].join("__");
}

function findMCQDraftRow_(sheet, draftKey) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i][0]) === String(draftKey)) {
      return i + 2;
    }
  }

  return -1;
}

function splitMCQDraftJson_(jsonText) {
  const chunks = [];

  for (let i = 0; i < jsonText.length; i += MCQ_DRAFT_CHUNK_SIZE) {
    chunks.push(jsonText.slice(i, i + MCQ_DRAFT_CHUNK_SIZE));
  }

  return chunks;
}

function saveMCQDraftToServer(payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        message: "Payload nháp MCQ không hợp lệ."
      };
    }

    const userId = String(payload.userId || "").trim();
    const email = String(payload.email || "").trim();
    const topicId = String(payload.topicId || "").trim();
    const quizMode = String(payload.quizMode || "instant").trim();
    const attemptId = String(
      payload.attemptId ||
      (payload.state && payload.state.attemptId) ||
      ""
    ).trim();

    if ((!userId && !email) || !topicId || !quizMode) {
      return {
        success: false,
        message: "Thiếu userId/email/topicId/quizMode khi lưu nháp MCQ."
      };
    }

    const state = payload.state && typeof payload.state === "object"
      ? payload.state
      : payload;

    state.userId = userId;
    state.email = email;
    state.topicId = topicId;
    state.quizMode = quizMode;
    state.attemptId = attemptId;
    state.status = "in_progress";
    state.serverSavedAt = new Date().toISOString();

    const jsonText = JSON.stringify(state);
    const chunks = splitMCQDraftJson_(jsonText);

    if (chunks.length > MCQ_DRAFT_MAX_CHUNKS) {
      return {
        success: false,
        message: "Nháp MCQ quá lớn, cần tăng MCQ_DRAFT_MAX_CHUNKS."
      };
    }

    const sheet = ensureMCQDraftSheet_(email);
    if (!sheet) {
      return {
        success: false,
        message: "Không tìm thấy Personal Spreadsheet cho người dùng này."
      };
    }

    const draftKey = buildMCQDraftKey_(userId, email, topicId, quizMode);
    let row = findMCQDraftRow_(sheet, draftKey);
    const headerMap = getMCQDraftHeaderMap_(sheet);
    const attemptIdCol = getMCQDraftColByHeader_(headerMap, "AttemptId", 8);
    const statusCol = getMCQDraftColByHeader_(headerMap, "Status", 9);
    const savedAtCol = getMCQDraftColByHeader_(headerMap, "SavedAt", 10);
    const updatedAtCol = getMCQDraftColByHeader_(headerMap, "UpdatedAt", 11);
    const completedAtCol = getMCQDraftColByHeader_(headerMap, "CompletedAt", 12);

    if (row !== -1) {
      const existingStatus = String(
        sheet.getRange(row, statusCol).getValue() || ""
      ).trim().toLowerCase();

      const existingAttemptId = String(
        sheet.getRange(row, attemptIdCol).getValue() || ""
      ).trim();

      if (existingStatus === "completed") {
        const existingSavedAt = sheet.getRange(row, savedAtCol).getValue();
        const existingUpdatedAt = sheet.getRange(row, updatedAtCol).getValue();
        const existingCompletedAt = sheet.getRange(row, completedAtCol).getValue();

        const completedTime = getMCQDraftMaxTimeMs_(
          existingCompletedAt,
          existingUpdatedAt,
          existingSavedAt
        );

        // Chỉ dùng savedAt từ local draft/payload.
        // Không dùng serverSavedAt vì serverSavedAt luôn là thời điểm hiện tại,
        // nếu dùng nó thì pending draft cũ sẽ bị hiểu nhầm là mới.
        const payloadSavedTime = getMCQDraftTimeMs_(
          (payload.state && payload.state.savedAt) || payload.savedAt
        );

        // Case 1: Không có attemptId hoặc trùng attemptId đã completed
        // => chắc chắn là bản nháp cũ của bài đã nộp.
        if (!attemptId || attemptId === existingAttemptId) {
          return buildMCQStaleDraftIgnoredResponse_(
            draftKey,
            existingAttemptId,
            "same_attempt_already_completed"
          );
        }

        // Case 2: AttemptId khác nhưng savedAt của payload cũ hơn hoặc bằng completedAt/updatedAt
        // => thường là pending queue cũ từ thiết bị khác, không được ghi đè completed.
        if (!payloadSavedTime || (completedTime && payloadSavedTime <= completedTime)) {
          return buildMCQStaleDraftIgnoredResponse_(
            draftKey,
            existingAttemptId,
            "payload_older_than_completed_tombstone"
          );
        }

        // Case 3: AttemptId khác và savedAt mới hơn completedAt
        // => xem như lượt làm mới hơn, cho phép ghi lại in_progress.
      }
    }

    if (row === -1) {
      row = sheet.getLastRow() + 1;
    }

    const values = [
      draftKey,
      userId,
      email,
      topicId,
      String(payload.topicTitle || state.topicTitle || ""),
      String(payload.contentDocId || state.contentDocId || ""),
      quizMode,
      attemptId,
      "in_progress",
      new Date(Number(state.savedAt || Date.now())),
      new Date(),
      "",
      ""
    ];

    for (let i = 0; i < MCQ_DRAFT_MAX_CHUNKS; i++) {
      values.push(chunks[i] || "");
    }

    sheet.getRange(row, 1, 1, values.length).setValues([values]);

    return {
      success: true,
      draftKey: draftKey,
      savedAt: new Date().toISOString(),
      attemptId: attemptId
    };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function getMCQDraftFromServer(payload) {
  try {
    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        message: "Payload đọc nháp MCQ không hợp lệ."
      };
    }

    const userId = String(payload.userId || "").trim();
    const email = String(payload.email || "").trim();
    const topicId = String(payload.topicId || "").trim();
    const quizMode = String(payload.quizMode || "instant").trim();

    if ((!userId && !email) || !topicId || !quizMode) {
      return {
        success: true,
        draft: null
      };
    }

    const sheet = ensureMCQDraftSheet_(email);
    if (!sheet) {
      return {
        success: true,
        draft: null
      };
    }

    const draftKey = buildMCQDraftKey_(userId, email, topicId, quizMode);
    const row = findMCQDraftRow_(sheet, draftKey);

    if (row === -1) {
      return {
        success: true,
        draft: null
      };
    }

    const headerMap = getMCQDraftHeaderMap_(sheet);

    const statusCol = getMCQDraftColByHeader_(headerMap, "Status", 9);
    const completedAtCol = getMCQDraftColByHeader_(headerMap, "CompletedAt", 12);
    const attemptIdCol = getMCQDraftColByHeader_(headerMap, "AttemptId", 8);
    const jsonStartCol = getMCQDraftColByHeader_(headerMap, "Json1", 14);

    const status = String(sheet.getRange(row, statusCol).getValue() || "")
      .trim()
      .toLowerCase();

    const completedAtValue = completedAtCol
      ? sheet.getRange(row, completedAtCol).getValue()
      : "";

    const attemptId = attemptIdCol
      ? String(sheet.getRange(row, attemptIdCol).getValue() || "").trim()
      : "";

    // Nếu dòng này là tombstone completed thì tuyệt đối không restore nháp.
    if (status === "completed") {
      return {
        success: true,
        draft: null,
        status: "completed",
        completed: true,
        attemptId: attemptId,
        completedAt: normalizeMCQDraftDate_(completedAtValue),
        message: "Bài quiz này đã hoàn thành, không phục hồi nháp."
      };
    }

    const chunks = sheet
      .getRange(row, jsonStartCol, 1, MCQ_DRAFT_MAX_CHUNKS)
      .getValues()[0];

    const jsonText = chunks.join("");

    if (!jsonText) {
      return {
        success: true,
        draft: null,
        status: status || "empty"
      };
    }

    const draft = JSON.parse(jsonText);

    // Lớp bảo vệ phụ: nếu JSON còn sót nhưng bên trong draft đã ghi completed,
    // cũng không cho restore.
    if (
      draft &&
      String(draft.status || "").trim().toLowerCase() === "completed"
    ) {
      return {
        success: true,
        draft: null,
        status: "completed",
        completed: true,
        attemptId: draft.attemptId || attemptId,
        completedAt: draft.completedAt || normalizeMCQDraftDate_(completedAtValue),
        message: "Draft JSON đã completed, không phục hồi nháp."
      };
    }

    return {
      success: true,
      draft: draft,
      status: status || "in_progress",
      attemptId: draft && draft.attemptId ? draft.attemptId : attemptId
    };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error),
      draft: null
    };
  }
}

function getMCQDraftHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};

  headers.forEach(function (header, index) {
    const key = String(header || "").trim();
    if (key) {
      map[key] = index; // zero-based index
    }
  });

  return map;
}

function getMCQDraftValueByHeader_(rowValues, headerMap, headerName, fallbackIndex) {
  let index = headerMap[headerName];

  if (index === undefined || index === null) {
    index = fallbackIndex;
  }

  if (index === undefined || index === null || index < 0) {
    return "";
  }

  return rowValues[index];
}

function getMCQDraftColByHeader_(headerMap, headerName, fallbackCol) {
  let index = headerMap[headerName];
  if (index !== undefined && index !== null && index >= 0) {
    return index + 1; // 1-based column index for getRange(row, col)
  }
  return fallbackCol;
}

function normalizeMCQDraftDate_(value) {
  if (!value) return "";

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return String(value);
}

function getMCQDraftTimeMs_(value) {
  if (!value) return 0;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.getTime();
  }

  if (typeof value === "number" && isFinite(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return 0;
}

function getMCQDraftMaxTimeMs_() {
  let maxTime = 0;

  for (let i = 0; i < arguments.length; i++) {
    const time = getMCQDraftTimeMs_(arguments[i]);
    if (time > maxTime) {
      maxTime = time;
    }
  }

  return maxTime;
}

function buildMCQStaleDraftIgnoredResponse_(draftKey, existingAttemptId, reason) {
  return {
    success: true,
    ignored: true,
    code: "STALE_DRAFT_ALREADY_COMPLETED",
    message: "Bài làm này đã được hoàn thành trước đó. Bản nháp cũ không được ghi đè.",
    reason: reason || "completed_tombstone_is_newer",
    draftKey: draftKey,
    status: "completed",
    attemptId: existingAttemptId || ""
  };
}

function getMCQDraftStatusFromServer(payload) {
  try {
    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        message: "Payload kiểm tra trạng thái nháp MCQ không hợp lệ."
      };
    }

    const userId = String(payload.userId || "").trim();
    const email = String(payload.email || "").trim();
    const topicId = String(payload.topicId || "").trim();
    const quizMode = String(payload.quizMode || "instant").trim();

    if ((!userId && !email) || !topicId || !quizMode) {
      return {
        success: true,
        exists: false,
        found: false,
        status: "missing",
        draft: null,
        message: "Thiếu userId/email/topicId/quizMode."
      };
    }

    const sheet = ensureMCQDraftSheet_(email);

    if (!sheet) {
      return {
        success: true,
        exists: false,
        found: false,
        status: "missing",
        draft: null,
        message: "Không tìm thấy Personal Spreadsheet hoặc sheet MCQ_Drafts."
      };
    }

    const draftKey = buildMCQDraftKey_(userId, email, topicId, quizMode);
    const row = findMCQDraftRow_(sheet, draftKey);

    if (row === -1) {
      return {
        success: true,
        exists: false,
        found: false,
        status: "missing",
        draftKey: draftKey,
        draft: null,
        serverTime: new Date().toISOString()
      };
    }

    const lastColumn = sheet.getLastColumn();
    const rowValues = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
    const headerMap = getMCQDraftHeaderMap_(sheet);

    const status =
      String(getMCQDraftValueByHeader_(rowValues, headerMap, "Status", 8) || "in_progress")
        .trim() || "in_progress";

    const savedAt = normalizeMCQDraftDate_(
      getMCQDraftValueByHeader_(rowValues, headerMap, "SavedAt", 9)
    );

    const updatedAt = normalizeMCQDraftDate_(
      getMCQDraftValueByHeader_(rowValues, headerMap, "UpdatedAt", 10)
    );

    const completedAt = normalizeMCQDraftDate_(
      getMCQDraftValueByHeader_(rowValues, headerMap, "CompletedAt", -1)
    );

    const attemptId = String(
      getMCQDraftValueByHeader_(rowValues, headerMap, "AttemptId", 7) || ""
    ).trim();

    const jsonStartIndex =
      headerMap["Json1"] !== undefined && headerMap["Json1"] !== null
        ? headerMap["Json1"]
        : 11;

    let hasDraftData = false;

    for (let i = 0; i < MCQ_DRAFT_MAX_CHUNKS; i++) {
      const chunkValue = rowValues[jsonStartIndex + i];
      if (String(chunkValue || "").trim()) {
        hasDraftData = true;
        break;
      }
    }

    return {
      success: true,
      exists: true,
      found: true,
      draftKey: draftKey,
      row: row,

      status: status,
      savedAt: savedAt,
      updatedAt: updatedAt,
      completedAt: completedAt,
      attemptId: attemptId,

      topicId: String(getMCQDraftValueByHeader_(rowValues, headerMap, "TopicId", 3) || ""),
      topicTitle: String(getMCQDraftValueByHeader_(rowValues, headerMap, "TopicTitle", 4) || ""),
      contentDocId: String(getMCQDraftValueByHeader_(rowValues, headerMap, "ContentDocId", 5) || ""),
      quizMode: String(getMCQDraftValueByHeader_(rowValues, headerMap, "QuizMode", 6) || quizMode),

      hasDraftData: hasDraftData,
      serverTime: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      exists: false,
      found: false,
      status: "error",
      message: error && error.message ? error.message : String(error),
      serverTime: new Date().toISOString()
    };
  }
}

function deleteMCQDraftFromServer(payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        message: "Payload hoàn thành nháp MCQ không hợp lệ."
      };
    }

    const userId = String(payload.userId || "").trim();
    const email = String(payload.email || "").trim();
    const topicId = String(payload.topicId || "").trim();
    const topicTitle = String(payload.topicTitle || "").trim();
    const contentDocId = String(payload.contentDocId || "").trim();
    const quizMode = String(payload.quizMode || "instant").trim();
    const attemptId = String(payload.attemptId || "").trim();
    const completedResultId = String(
      payload.completedResultId ||
      payload.resultId ||
      payload.quizResultId ||
      ""
    ).trim();

    if ((!userId && !email) || !topicId || !quizMode) {
      return {
        success: true,
        completed: false,
        message: "Thiếu userId/email/topicId/quizMode."
      };
    }

    const sheet = ensureMCQDraftSheet_(email);
    if (!sheet) {
      return {
        success: true,
        completed: false,
        message: "Không tìm thấy sheet MCQ_Drafts."
      };
    }

    const now = new Date();
    const draftKey = buildMCQDraftKey_(userId, email, topicId, quizMode);
    let row = findMCQDraftRow_(sheet, draftKey);
    let createdTombstone = false;

    const headerMap = getMCQDraftHeaderMap_(sheet);

    const draftKeyCol = getMCQDraftColByHeader_(headerMap, "DraftKey", 1);
    const userIdCol = getMCQDraftColByHeader_(headerMap, "UserId", 2);
    const emailCol = getMCQDraftColByHeader_(headerMap, "Email", 3);
    const topicIdCol = getMCQDraftColByHeader_(headerMap, "TopicId", 4);
    const topicTitleCol = getMCQDraftColByHeader_(headerMap, "TopicTitle", 5);
    const contentDocIdCol = getMCQDraftColByHeader_(headerMap, "ContentDocId", 6);
    const quizModeCol = getMCQDraftColByHeader_(headerMap, "QuizMode", 7);
    const attemptIdCol = getMCQDraftColByHeader_(headerMap, "AttemptId", 8);
    const statusCol = getMCQDraftColByHeader_(headerMap, "Status", 9);
    const savedAtCol = getMCQDraftColByHeader_(headerMap, "SavedAt", 10);
    const updatedAtCol = getMCQDraftColByHeader_(headerMap, "UpdatedAt", 11);
    const completedAtCol = getMCQDraftColByHeader_(headerMap, "CompletedAt", 12);
    const completedResultIdCol = getMCQDraftColByHeader_(headerMap, "CompletedResultId", 13);
    const jsonStartCol = getMCQDraftColByHeader_(headerMap, "Json1", 14);

    // ⭐ Quan trọng:
    // Nếu chưa từng có draft row trên server, vẫn tạo mới 1 dòng tombstone completed.
    if (row === -1) {
      row = sheet.getLastRow() + 1;
      createdTombstone = true;

      if (draftKeyCol) sheet.getRange(row, draftKeyCol).setValue(draftKey);
      if (userIdCol) sheet.getRange(row, userIdCol).setValue(userId);
      if (emailCol) sheet.getRange(row, emailCol).setValue(email);
      if (topicIdCol) sheet.getRange(row, topicIdCol).setValue(topicId);
      if (topicTitleCol) sheet.getRange(row, topicTitleCol).setValue(topicTitle);
      if (contentDocIdCol) sheet.getRange(row, contentDocIdCol).setValue(contentDocId);
      if (quizModeCol) sheet.getRange(row, quizModeCol).setValue(quizMode);
      if (savedAtCol) sheet.getRange(row, savedAtCol).setValue(now);
    }

    if (attemptIdCol) {
      sheet.getRange(row, attemptIdCol).setValue(attemptId);
    }

    if (statusCol) {
      sheet.getRange(row, statusCol).setValue("completed");
    }

    if (updatedAtCol) {
      sheet.getRange(row, updatedAtCol).setValue(now);
    }

    if (completedAtCol) {
      sheet.getRange(row, completedAtCol).setValue(now);
    }

    if (completedResultId && completedResultIdCol) {
      sheet.getRange(row, completedResultIdCol).setValue(completedResultId);
    }

    // Xóa JSON nháp cho nhẹ sheet.
    const emptyChunks = new Array(MCQ_DRAFT_MAX_CHUNKS).fill("");
    if (jsonStartCol) {
      sheet
        .getRange(row, jsonStartCol, 1, MCQ_DRAFT_MAX_CHUNKS)
        .setValues([emptyChunks]);
    }

    return {
      success: true,
      completed: true,
      deleted: false,
      createdTombstone: createdTombstone,
      draftKey: draftKey,
      status: "completed",
      attemptId: attemptId,
      updatedAt: now.toISOString(),
      completedAt: now.toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function cleanupOldMCQDraftTombstonesForUser(email, keepDays) {
  const targetEmail = String(email || "").trim();

  if (!targetEmail) {
    return {
      success: false,
      message: "Thiếu email người dùng để dọn MCQ tombstone."
    };
  }

  const days = Number(keepDays || MCQ_DRAFT_TOMBSTONE_KEEP_DAYS);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  const cutoffTime = Date.now() - safeDays * 24 * 60 * 60 * 1000;

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const sheet = ensureMCQDraftSheet_(targetEmail);

    if (!sheet) {
      return {
        success: true,
        deleted: 0,
        message: "Không tìm thấy sheet MCQ_Drafts của người dùng."
      };
    }

    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return {
        success: true,
        deleted: 0
      };
    }

    const columnMap = getMCQDraftColumnMap_(sheet);

    const statusCol = columnMap.Status;
    const updatedAtCol = columnMap.UpdatedAt;
    const savedAtCol = columnMap.SavedAt;

    if (!statusCol) {
      return {
        success: false,
        message: "Sheet MCQ_Drafts thiếu cột Status."
      };
    }

    const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    let deleted = 0;

    // Duyệt từ dưới lên để khi deleteRow không làm lệch index
    for (let i = values.length - 1; i >= 0; i--) {
      const rowValues = values[i];
      const realRow = i + 2;

      const status = String(rowValues[statusCol - 1] || "").trim().toLowerCase();

      if (status !== "completed") {
        continue;
      }

      const updatedAt = updatedAtCol
        ? getMCQDraftCellDate_(rowValues[updatedAtCol - 1])
        : null;

      const savedAt = savedAtCol
        ? getMCQDraftCellDate_(rowValues[savedAtCol - 1])
        : null;

      const baseDate = updatedAt || savedAt;

      if (!baseDate) {
        continue;
      }

      if (baseDate.getTime() < cutoffTime) {
        sheet.deleteRow(realRow);
        deleted++;
      }
    }

    return {
      success: true,
      deleted: deleted,
      keepDays: safeDays
    };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : String(error)
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function cleanupOldMCQDraftTombstonesForCurrentUser(emailOrPayload) {
  let email = "";

  if (typeof emailOrPayload === "string" && emailOrPayload.trim()) {
    email = emailOrPayload.trim();
  } else if (emailOrPayload && typeof emailOrPayload === "object") {
    if (emailOrPayload.email) email = String(emailOrPayload.email).trim();
  }

  if (!email) {
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {
      email = "";
    }
  }

  if (!email) {
    return {
      success: false,
      message: "Không lấy được email người dùng hiện tại."
    };
  }

  return cleanupOldMCQDraftTombstonesForUser(
    email,
    MCQ_DRAFT_TOMBSTONE_KEEP_DAYS
  );
}
