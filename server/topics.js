/**
 * topics.js - Topics Management Server-Side Functions
 *
 * Handles all topic-related operations: get topics, user progress, unlock logic
 */

// ⭐ CACHE phía server để giảm số lần đọc spreadsheet
const TOPICS_CACHE_KEY = "ALL_TOPICS_CACHE";
const TOPICS_CACHE_DURATION = 300; // Cache 5 phút (tính bằng giây trong CacheService)

/**
 * Get all topics from MASTER_DB
 * Updated to read dynamic columns including contentDocId/contentDocUrl
 * ⭐ OPTIMIZED: Thêm cache phía server bằng CacheService
 */
function getAllTopicsIncludingHidden() {
  Logger.log("=== BẮT ĐẦU HÀM getAllTopics ===");

  try {
    // ⭐ Kiểm tra cache phía server
    const cache = CacheService.getScriptCache();
    const cachedTopics = cache.get(TOPICS_CACHE_KEY);
    
    if (cachedTopics) {
      Logger.log("✅ Using server-side cached topics (CacheService)");
      // parse result back from JSON string
      return JSON.parse(cachedTopics);
    }

    const SPREADSHEET_ID = "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const SHEET_NAME = "Topics";

    Logger.log("Opening spreadsheet: " + SPREADSHEET_ID);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      const availableSheets = ss
        .getSheets()
        .map((s) => s.getName())
        .join(", ");

      Logger.log("❌ Lỗi: Không tìm thấy sheet tên là '" + SHEET_NAME + "'");
      Logger.log("Các sheet có sẵn: " + availableSheets);

      return {
        success: false,
        message: "Không tìm thấy Sheet dữ liệu: " + SHEET_NAME,
        availableSheets: availableSheets,
      };
    }

    Logger.log("✅ Found sheet: " + SHEET_NAME);

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    Logger.log("Last row: " + lastRow);

    if (lastRow < 2) {
      Logger.log("⚠️ No data rows found (only header or empty sheet)");
      return {
        success: true,
        topics: [],
        count: 0,
      };
    }

    // ⭐ ĐỌC TOÀN BỘ CỘT DỰA TRÊN HEADER (hỗ trợ thêm contentDocUrl)
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

    Logger.log("Đã lấy được " + data.length + " dòng dữ liệu");

    const col = {
      topicId: headers.indexOf("topicId"),
      title: headers.indexOf("title"),
      description: headers.indexOf("description"),
      category: headers.indexOf("category"),
      order: headers.indexOf("order"),
      iconUrl: headers.indexOf("iconUrl"),
      estimatedTime: headers.indexOf("estimatedTime"),
      prerequisiteTopics: headers.indexOf("prerequisiteTopics"),
      isLocked: headers.indexOf("isLocked"),
      unlockCondition: headers.indexOf("unlockCondition"),
      createdBy: headers.indexOf("createdBy"),
      createdAt: headers.indexOf("createdAt"),
      updatedAt: headers.indexOf("updatedAt"),
      contentDocId: headers.indexOf("contentDocId"),
      contentDocUrl: headers.indexOf("contentDocUrl"),
      quizStatus: headers.indexOf("quizStatus"),
    };

    const topics = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      const topicId =
        col.topicId >= 0 && row[col.topicId] ? String(row[col.topicId]).trim() : "";

      if (!topicId) {
        continue; // Skip empty rows silently for performance
      }

      topics.push({
        topicId: topicId,
        rowIndex: i + 2,
        title:
          col.title >= 0 && row[col.title] !== undefined
            ? String(row[col.title])
            : "",
        description:
          col.description >= 0 && row[col.description] !== undefined
            ? String(row[col.description])
            : "",
        category:
          col.category >= 0 && row[col.category] !== undefined
            ? String(row[col.category])
            : "",
        order:
          col.order >= 0 && row[col.order] !== undefined
            ? Number(row[col.order]) || 0
            : 0,
        iconUrl:
          col.iconUrl >= 0 && row[col.iconUrl] !== undefined
            ? String(row[col.iconUrl] || "")
            : "",
        estimatedTime:
          col.estimatedTime >= 0 && row[col.estimatedTime] !== undefined
            ? String(row[col.estimatedTime] || "")
            : "",
        prerequisiteTopics:
          col.prerequisiteTopics >= 0 &&
          row[col.prerequisiteTopics] !== undefined
            ? String(row[col.prerequisiteTopics] || "")
            : "",
        isLocked:
          col.isLocked >= 0 && row[col.isLocked] !== undefined
            ? (row[col.isLocked] === true || String(row[col.isLocked]).toLowerCase() === "true")
            : false,
        unlockCondition:
          col.unlockCondition >= 0 &&
          row[col.unlockCondition] !== undefined
            ? String(row[col.unlockCondition] || "")
            : "",
        createdBy:
          col.createdBy >= 0 && row[col.createdBy] !== undefined
            ? String(row[col.createdBy] || "")
            : "",
        createdAt:
          col.createdAt >= 0 && row[col.createdAt] instanceof Date
            ? row[col.createdAt].toISOString()
            : col.createdAt >= 0
              ? String(row[col.createdAt] || "")
              : "",
        updatedAt:
          col.updatedAt >= 0 && row[col.updatedAt] instanceof Date
            ? row[col.updatedAt].toISOString()
            : col.updatedAt >= 0
              ? String(row[col.updatedAt] || "")
              : "",

        // ⭐ THÊM CỘT CONTENT DOC ID + URL
        contentDocId:
          col.contentDocId >= 0 && row[col.contentDocId] !== undefined
            ? String(row[col.contentDocId] || "")
            : "",
        contentDocUrl:
          col.contentDocUrl >= 0 && row[col.contentDocUrl] !== undefined
            ? String(row[col.contentDocUrl] || "")
            : "",

        // ⭐ THÊM CỘT QUIZ STATUS
        quizStatus:
          col.quizStatus >= 0 && row[col.quizStatus] !== undefined
            ? String(row[col.quizStatus] || "need_questions")
            : "need_questions",

        // Map thêm trường cho Frontend hiển thị
        journey: mapCategoryToJourney(
          col.category >= 0 && row[col.category] !== undefined
            ? row[col.category]
            : "",
        ),
        totalStages: 5,
        minAILevel: 1,
        minAccuracy: 70,
      });
    }

    topics.sort(function(a, b) {
      var catA = normalizeCategoryName(a.category);
      var catB = normalizeCategoryName(b.category);

      if (catA !== catB) {
        return catA.localeCompare(catB, 'vi');
      }

      // Không sort theo order nữa.
      // Giữ thứ tự dòng DB bằng rowIndex.
      return (a.rowIndex || 0) - (b.rowIndex || 0);
    });

    Logger.log("✅ Successfully processed " + topics.length + " topics");

    const result = {
      success: true,
      topics: topics,
      count: topics.length,
    };

    // ⭐ Lưu vào cache
    try {
      // Chunking if the string is too large (>100KB), but topics array is usually small enough.
      const cacheString = JSON.stringify(result);
      if (cacheString.length < 100000) {
        CacheService.getScriptCache().put(TOPICS_CACHE_KEY, cacheString, TOPICS_CACHE_DURATION);
      }
    } catch(e) {
      Logger.log("⚠️ Could not save to CacheService: " + e.toString());
    }

    return result;
  } catch (error) {
    Logger.log("❌ LỖI NGHIÊM TRỌNG TRONG getAllTopics: " + error.toString());
    Logger.log("Error stack: " + error.stack);

    return {
      success: false,
      message: "Lỗi Server: " + error.toString(),
      error: error.stack,
    };
  }
}

/**
 * ⭐ Clear topics cache (gọi khi admin cập nhật topics)
 */
function clearTopicsCache() {
  try {
    CacheService.getScriptCache().remove(TOPICS_CACHE_KEY);
    Logger.log("✅ Topics cache cleared");
  } catch(e) {
    Logger.log("⚠️ Failed to clear cache: " + e.toString());
  }
}

function isTopicHidden(topic) {
  if (!topic) return false;

  return (
    topic.isLocked === true ||
    topic.isLocked === 'TRUE' ||
    topic.isLocked === 'true' ||
    String(topic.isLocked || '').trim().toLowerCase() === 'true'
  );
}

function getAllTopics() {
  var result = getAllTopicsIncludingHidden();

  if (result && result.success && Array.isArray(result.topics)) {
    var visibleTopics = result.topics.filter(function(topic) {
      return !isTopicHidden(topic);
    });

    return {
      success: true,
      topics: visibleTopics,
      count: visibleTopics.length
    };
  }

  return result;
}

/**
 * Helper function: Normalize category name for sorting
 */
function normalizeCategoryName(category) {
  var value = String(category || '').trim();
  return value || 'Chưa phân loại';
}

/**
 * Helper function: Map category to journey level
 */
function mapCategoryToJourney(category) {
  if (!category) return "Beginner";

  const cat = category.toString().toLowerCase();

  if (cat.includes("fundamental") || cat.includes("logic")) {
    return "Beginner";
  }

  if (
    cat.includes("control") ||
    cat.includes("data") ||
    cat.includes("struct") ||
    cat.includes("programming")
  ) {
    return "Intermediate";
  }

  if (
    cat.includes("algorithm") ||
    cat.includes("advanced") ||
    cat.includes("optimize")
  ) {
    return "Advanced";
  }

  return "Beginner"; // Default
}

/**
 * Get topics by journey level
 */
function getTopicsByJourney(journey) {
  try {
    const result = getAllTopics();

    if (!result.success) {
      return result;
    }

    const filteredTopics = result.topics.filter(
      (topic) => topic.journey === journey,
    );

    return {
      success: true,
      topics: filteredTopics,
      count: filteredTopics.length,
    };
  } catch (error) {
    Logger.log("Error in getTopicsByJourney: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Get single topic by ID
 */
function getTopicById(topicId) {
  try {
    Logger.log("Getting topic: " + topicId);

    const result = getAllTopics();

    if (!result.success) {
      return result;
    }

    const topic = result.topics.find((t) => t.topicId === topicId);

    if (!topic) {
      return {
        success: false,
        message: "Topic not found",
      };
    }

    return {
      success: true,
      topic: topic,
    };
  } catch (error) {
    Logger.log("Error in getTopicById: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Get user's progress for all topics
 */
function getUserTopicProgress() {
  try {
    // ⭐ FIX: Use Session.getActiveUser() + getUserProgressSheetIdByEmail (working pattern)
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    Logger.log("Getting topic progress for user: " + userEmail);

    // Get user's personal spreadsheet ID using working function
    const userSheetId = getUserProgressSheetIdByEmail(userEmail);

    if (!userSheetId) {
      Logger.log("User progress sheet not found for: " + userEmail);
      return {
        success: true,
        progress: {}, // Empty progress for new users
      };
    }

    // Open spreadsheet by ID
    const userSheet = SpreadsheetApp.openById(userSheetId);

    // Get Topic_Progress sheet
    const progressSheet = userSheet.getSheetByName("Topic_Progress");

    if (!progressSheet) {
      return {
        success: true,
        progress: {},
      };
    }

    const data = progressSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Fetch all topics to check quizStatus requirement
    const topicsResult = getAllTopicsIncludingHidden();
    const topicMap = {};
    if (topicsResult && topicsResult.success && Array.isArray(topicsResult.topics)) {
      topicsResult.topics.forEach(function (t) {
        topicMap[String(t.topicId)] = t;
      });
    }

    // Map progress data - support both old and new schema
    const progress = {};
    rows.forEach((row) => {
      const topicIdIdx = headers.indexOf("topicId");
      const topicId =
        topicIdIdx >= 0
          ? String(row[topicIdIdx]).trim()
          : String(row[0]).trim();

      if (topicId) {
        // Check for new schema columns
        const lessonCompletedIdx = headers.indexOf("lessonCompleted");
        const mindmapViewedIdx = headers.indexOf("mindmapViewed");
        const flashcardsCompletedIdx = headers.indexOf("flashcardsCompleted");
        const quizDoneIdx = headers.indexOf("quizDone");
        const matchingDoneIdx = headers.indexOf("matchingDone");
        const statusIdx = headers.indexOf("status");
        const completedAtIdx = headers.indexOf("completedAt");
        const accessGrantedIdx = headers.indexOf("accessGranted");
        const accessGrantedAtIdx = headers.indexOf("accessGrantedAt");
        const accessGrantReasonIdx = headers.indexOf("accessGrantReason");
        const accessGrantPrerequisiteIdsIdx = headers.indexOf("accessGrantPrerequisiteIds");
        const firstAccessAtIdx = headers.indexOf("firstAccessAt");

        if (lessonCompletedIdx >= 0) {
          // New schema - ⭐ FIX: Handle string/number/boolean values from spreadsheet
          var isChecked = function (val) {
            if (val === null || val === undefined) return false;
            if (typeof val === "boolean") return val;
            if (typeof val === "number") return val === 1;
            var s = String(val).trim().toLowerCase();
            return (
              s === "1" ||
              s === "true" ||
              s === "hoàn thành" ||
              s === "đã chơi" ||
              s === "đã hoàn thành" ||
              s === "x" ||
              s === "yes"
            );
          };
          const lessonDone = isChecked(row[lessonCompletedIdx]);
          const mindmapDone =
            mindmapViewedIdx >= 0 && isChecked(row[mindmapViewedIdx]);
          const flashcardsDone =
            flashcardsCompletedIdx >= 0 &&
            isChecked(row[flashcardsCompletedIdx]);
          const quizDone = quizDoneIdx >= 0 && isChecked(row[quizDoneIdx]);

          // Mini quiz completed
          const miniQuizCompletedIdx = headers.indexOf("miniQuizCompleted");
          const miniQuizDone =
            miniQuizCompletedIdx >= 0 && isChecked(row[miniQuizCompletedIdx]);

          // ⭐ Matching done
          const matchingDone =
            matchingDoneIdx >= 0 && isChecked(row[matchingDoneIdx]);

          // ⭐ Calculate progress percentage based on 4 activities (25% each)
          // 4 phần: Bài học, Mindmap, Flashcard, Mini Quiz
          let progressPercent = 0;
          let completedCount = 0;
          const totalActivities = 4; // lesson, mindmap, flashcards, miniQuiz
          if (lessonDone) completedCount++;
          if (mindmapDone) completedCount++;
          if (flashcardsDone) completedCount++;
          if (miniQuizDone) completedCount++;
          progressPercent = Math.round(
            (completedCount / totalActivities) * 100,
          );

          const topic = topicMap[topicId];
          const quizRequired = topic && topic.quizStatus === "active";

          progress[topicId] = {
            topicId: topicId,
            completed:
              lessonDone && mindmapDone && flashcardsDone && miniQuizDone && (!quizRequired || quizDone),
            progress: progressPercent,
            lessonCompleted: lessonDone,
            mindmapViewed: mindmapDone,
            flashcardsCompleted: flashcardsDone,
            quizDone: quizDone,
            miniQuizCompleted: miniQuizDone,
            matchingDone: matchingDone,
            status: statusIdx >= 0 ? row[statusIdx] : "in_progress",
            completedAt: completedAtIdx >= 0 
              ? (row[completedAtIdx] instanceof Date ? row[completedAtIdx].toISOString() : row[completedAtIdx]) 
              : null,
            accessGranted:
              accessGrantedIdx >= 0 ? isChecked(row[accessGrantedIdx]) : false,
            accessGrantedAt:
              accessGrantedAtIdx >= 0
                ? (row[accessGrantedAtIdx] instanceof Date
                    ? row[accessGrantedAtIdx].toISOString()
                    : row[accessGrantedAtIdx])
                : "",
            accessGrantReason:
              accessGrantReasonIdx >= 0 ? String(row[accessGrantReasonIdx] || "") : "",
            accessGrantPrerequisiteIds:
              accessGrantPrerequisiteIdsIdx >= 0
                ? String(row[accessGrantPrerequisiteIdsIdx] || "")
                : "",
            firstAccessAt:
              firstAccessAtIdx >= 0
                ? (row[firstAccessAtIdx] instanceof Date
                    ? row[firstAccessAtIdx].toISOString()
                    : row[firstAccessAtIdx])
                : ""
          };
        } else {
          // Old schema fallback
          progress[topicId] = {
            topicId: topicId,
            completed: row[1] === true || row[1] === "TRUE",
            progress: parseFloat(row[2]) || 0,
            stagesCompleted: parseInt(row[3]) || 0,
            totalStages: parseInt(row[4]) || 0,
            lastAccessed: row[5] instanceof Date ? row[5].toISOString() : row[5],
            completedAt: row[6] instanceof Date ? row[6].toISOString() : row[6],
          };
        }
      }
    });

    return {
      success: true,
      progress: progress,
    };
  } catch (error) {
    Logger.log("Error in getUserTopicProgress: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

function ensureTopicProgressColumns_(sheet) {
  var requiredColumns = [
    "topicId",
    "lessonCompleted",
    "mindmapViewed",
    "flashcardsCompleted",
    "miniQuizCompleted",
    "quizDone",
    "matchingDone",
    "completed",
    "progress",
    "status",
    "lastAccessed",
    "completedAt",
    "accessGranted",
    "accessGrantedAt",
    "accessGrantReason",
    "accessGrantPrerequisiteIds",
    "firstAccessAt"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredColumns.length).setValues([requiredColumns]);
    sheet.setFrozenRows(1);
    return requiredColumns;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  requiredColumns.forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
    }
  });

  return headers;
}

function grantTopicAccessForUser_(topicId, reason, prerequisiteIds) {
  var userEmail = Session.getActiveUser().getEmail();

  if (!userEmail) {
    return {
      success: false,
      message: "User not authenticated"
    };
  }

  var userSheetId = getUserProgressSheetIdByEmail(userEmail);

  if (!userSheetId) {
    return {
      success: false,
      message: "User personal sheet not found"
    };
  }

  var userSheet = SpreadsheetApp.openById(userSheetId);
  var progressSheet = userSheet.getSheetByName("Topic_Progress");

  if (!progressSheet) {
    progressSheet = userSheet.insertSheet("Topic_Progress");
  }

  var headers = ensureTopicProgressColumns_(progressSheet);
  var data = progressSheet.getDataRange().getValues();

  var topicIdCol = headers.indexOf("topicId");
  var accessGrantedCol = headers.indexOf("accessGranted");
  var accessGrantedAtCol = headers.indexOf("accessGrantedAt");
  var accessGrantReasonCol = headers.indexOf("accessGrantReason");
  var accessGrantPrerequisiteIdsCol = headers.indexOf("accessGrantPrerequisiteIds");
  var firstAccessAtCol = headers.indexOf("firstAccessAt");
  var lastAccessedCol = headers.indexOf("lastAccessed");
  var statusCol = headers.indexOf("status");

  var now = new Date();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][topicIdCol]).trim() === String(topicId).trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    var newRow = headers.map(function(h) {
      if (h === "topicId") return topicId;
      if (h === "accessGranted") return true;
      if (h === "accessGrantedAt") return now;
      if (h === "accessGrantReason") return reason || "normal";
      if (h === "accessGrantPrerequisiteIds") return (prerequisiteIds || []).join(",");
      if (h === "firstAccessAt") return now;
      if (h === "lastAccessed") return now;
      if (h === "status") return "in_progress";
      if (h === "completed") return false;
      if (h === "progress") return 0;
      return "";
    });

    progressSheet.appendRow(newRow);
  } else {
    progressSheet.getRange(rowIndex, accessGrantedCol + 1).setValue(true);
    progressSheet.getRange(rowIndex, accessGrantedAtCol + 1).setValue(now);
    progressSheet.getRange(rowIndex, accessGrantReasonCol + 1).setValue(reason || "normal");
    progressSheet
      .getRange(rowIndex, accessGrantPrerequisiteIdsCol + 1)
      .setValue((prerequisiteIds || []).join(","));

    if (firstAccessAtCol >= 0 && !data[rowIndex - 1][firstAccessAtCol]) {
      progressSheet.getRange(rowIndex, firstAccessAtCol + 1).setValue(now);
    }

    if (lastAccessedCol >= 0) {
      progressSheet.getRange(rowIndex, lastAccessedCol + 1).setValue(now);
    }

    if (statusCol >= 0 && !data[rowIndex - 1][statusCol]) {
      progressSheet.getRange(rowIndex, statusCol + 1).setValue("in_progress");
    }
  }

  SpreadsheetApp.flush();

  return {
    success: true
  };
}

/**
 * Update user's progress for a topic
 */
function updateUserTopicProgress(topicId, progressData) {
  try {
    // ⭐ FIX: Use Session.getActiveUser() instead of broken getUserSession() call
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "User not authenticated" };
    }

    Logger.log(
      `Updating topic progress for user ${userEmail}, topic ${topicId}`,
    );

    // Get user's personal spreadsheet ID
    const userSheetId = getUserProgressSheetIdByEmail(userEmail);

    if (!userSheetId) {
      Logger.log("User personal sheet not found for: " + userEmail);
      return { success: false, message: "User personal sheet not found" };
    }

    let userSheet = SpreadsheetApp.openById(userSheetId);

    // Get or create Topic_Progress sheet
    let progressSheet = userSheet.getSheetByName("Topic_Progress");

    if (!progressSheet) {
      progressSheet = userSheet.insertSheet("Topic_Progress");
      progressSheet.appendRow([
        "topicId",
        "completed",
        "progress",
        "stagesCompleted",
        "totalStages",
        "lastAccessed",
        "completedAt",
      ]);
    }

    // Find existing row or create new one
    const data = progressSheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === topicId) {
        rowIndex = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }

    const now = new Date();
    const rowData = [
      topicId,
      progressData.completed || false,
      progressData.progress || 0,
      progressData.stagesCompleted || 0,
      progressData.totalStages || 0,
      now,
      progressData.completed ? now : "",
    ];

    if (rowIndex > 0) {
      // Update existing row
      progressSheet
        .getRange(rowIndex, 1, 1, rowData.length)
        .setValues([rowData]);
    } else {
      // Append new row
      progressSheet.appendRow(rowData);
    }

    return {
      success: true,
      message: "Progress updated successfully",
    };
  } catch (error) {
    Logger.log("Error in updateUserTopicProgress: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Check if user can access a topic (unlock logic)
 */
function parsePrerequisiteTopicIds(topic) {
  var ids = [];

  if (topic.unlockCondition) {
    try {
      var condition = JSON.parse(topic.unlockCondition);
      if (condition && Array.isArray(condition.prerequisiteTopicIds)) {
        ids = condition.prerequisiteTopicIds;
      }
    } catch (e) {
      Logger.log('Cannot parse unlockCondition for ' + topic.topicId + ': ' + e);
    }
  }

  if (ids.length === 0 && topic.prerequisiteTopics) {
    ids = String(topic.prerequisiteTopics)
      .split(',')
      .map(function(id) {
        return String(id || '').trim();
      })
      .filter(Boolean);
  }

  return ids;
}

function getUnlockConditionObject(topic) {
  var condition = null;

  if (topic.unlockCondition) {
    try {
      condition = JSON.parse(topic.unlockCondition);
    } catch (e) {
      Logger.log('Invalid unlockCondition JSON for ' + topic.topicId + ': ' + e);
      condition = null;
    }
  }

  var ids = parsePrerequisiteTopicIds(topic);

  ids = ids
    .map(function(id) {
      return String(id || '').trim();
    })
    .filter(Boolean);

  if (!condition && ids.length === 0) {
    return null;
  }

  if (!condition) {
    condition = {
      type: 'complete_topic',
      mode: 'all',
      requiredProgress: 100,
      requiredQuizAccuracy: 0
    };
  }

  // Điểm sửa quan trọng:
  // Dù unlockCondition có tồn tại, vẫn ép prerequisiteTopicIds lấy từ nguồn chuẩn.
  condition.prerequisiteTopicIds = ids;

  if (!condition.mode) condition.mode = 'all';
  if (!condition.type) condition.type = 'complete_topic';

  return condition;
}

function evaluateTopicUnlock(topic, progressMap, topicMap) {
  if (!topic) {
    return {
      unlocked: false,
      reason: 'Không tìm thấy bài học.',
      missingPrerequisites: []
    };
  }

  // Topic hiện tại bị ẩn thì không bao giờ mở.
  if (isTopicHidden(topic)) {
    return {
      unlocked: false,
      hidden: true,
      reason: 'Bài học này đang được admin ẩn.',
      missingPrerequisites: []
    };
  }

  var ownProgress = progressMap[topic.topicId] || {};

  if (ownProgress.accessGranted === true || ownProgress.completed === true) {
    return {
      unlocked: true,
      hidden: false,
      reason: "",
      missingPrerequisites: [],
      alreadyGranted: true
    };
  }

  var hasContent =
    topic.contentDocId &&
    String(topic.contentDocId).trim() !== '' &&
    String(topic.contentDocId).trim() !== 'undefined' &&
    String(topic.contentDocId).trim() !== 'null';

  if (!hasContent) {
    return {
      unlocked: false,
      hidden: false,
      reason: 'Bài học này chưa có nội dung.',
      missingPrerequisites: []
    };
  }

  var condition = getUnlockConditionObject(topic);

  if (!condition) {
    return {
      unlocked: true,
      hidden: false,
      reason: '',
      missingPrerequisites: []
    };
  }

  var prereqIds = Array.isArray(condition.prerequisiteTopicIds)
    ? condition.prerequisiteTopicIds
    : [];

  prereqIds = prereqIds
    .map(function(id) {
      return String(id || '').trim();
    })
    .filter(Boolean);

  if (prereqIds.length === 0) {
    return {
      unlocked: true,
      hidden: false,
      reason: '',
      missingPrerequisites: []
    };
  }

  var visiblePrereqIds = [];
  var ignoredHiddenPrerequisites = [];

  prereqIds.forEach(function(prereqId) {
    var prereqTopic = topicMap[prereqId];

    // Chỉ bỏ qua đúng prerequisite đang bị ẩn.
    // Không ảnh hưởng đến các prerequisite khác.
    if (prereqTopic && isTopicHidden(prereqTopic)) {
      ignoredHiddenPrerequisites.push({
        topicId: prereqId,
        title: prereqTopic.title || prereqId
      });
      return;
    }

    // Nếu prerequisite không tồn tại trong DB thì KHÔNG nên auto mở.
    // Đưa vào missing để admin biết cấu hình sai.
    if (!prereqTopic) {
      visiblePrereqIds.push(prereqId);
      return;
    }

    visiblePrereqIds.push(prereqId);
  });

  // Nếu bài này chỉ phụ thuộc vào topic đã bị ẩn,
  // thì bài này được mở.
  if (visiblePrereqIds.length === 0) {
    return {
      unlocked: true,
      hidden: false,
      reason: '',
      missingPrerequisites: [],
      ignoredHiddenPrerequisites: ignoredHiddenPrerequisites
    };
  }

  var mode = condition.mode || 'all';
  var requiredQuizAccuracy = Number(condition.requiredQuizAccuracy || 0);

  var checks = visiblePrereqIds.map(function(prereqId) {
    var progress = progressMap[prereqId] || {};
    var prereqTopic = topicMap[prereqId] || {};
    var completed = progress.completed === true;

    var quizOk = true;

    if (
      condition.type === 'complete_topic_and_quiz' &&
      requiredQuizAccuracy > 0
    ) {
      quizOk =
        Number(progress.accuracy || progress.bestScore || 0) >=
        requiredQuizAccuracy;
    }

    return {
      topicId: prereqId,
      title: prereqTopic.title || prereqId,
      completed: completed,
      quizOk: quizOk,
      passed: completed && quizOk
    };
  });

  var unlocked =
    mode === 'any'
      ? checks.some(function(item) {
          return item.passed;
        })
      : checks.every(function(item) {
          return item.passed;
        });

  var missing = checks.filter(function(item) {
    return !item.passed;
  });

  return {
    unlocked: unlocked,
    hidden: false,
    reason: unlocked
      ? ''
      : 'Bạn cần hoàn thành: ' +
        missing
          .map(function(item) {
            return item.title;
          })
          .join(', '),
    missingPrerequisites: missing,
    ignoredHiddenPrerequisites: ignoredHiddenPrerequisites
  };
}

/**
 * Get topics with unlock and progress status evaluated on the server.
 */
function getTopicsForUserPage() {
  try {
    var allResult = getAllTopicsIncludingHidden();
    if (!allResult.success) return allResult;

    var allTopics = allResult.topics || [];

    var visibleTopics = allTopics.filter(function(topic) {
      return !isTopicHidden(topic);
    });

    var progressResult = getUserTopicProgress();
    var progressMap =
      progressResult && progressResult.success
        ? progressResult.progress || {}
        : {};

    var topicMap = {};
    allTopics.forEach(function(topic) {
      topicMap[String(topic.topicId)] = topic;
    });

    var enhancedTopics = visibleTopics.map(function(topic) {
      var access = evaluateTopicUnlock(topic, progressMap, topicMap);

      return Object.assign({}, topic, {
        unlocked: access.unlocked,
        lockedReason: access.reason,
        missingPrerequisites: access.missingPrerequisites || [],
        ignoredHiddenPrerequisites: access.ignoredHiddenPrerequisites || []
      });
    });

    enhancedTopics.sort(function(a, b) {
      var catA = normalizeCategoryName(a.category);
      var catB = normalizeCategoryName(b.category);

      if (catA !== catB) {
        return catA.localeCompare(catB, 'vi');
      }

      return (a.rowIndex || 0) - (b.rowIndex || 0);
    });

    return {
      success: true,
      topics: enhancedTopics,
      progress: progressMap,
      count: enhancedTopics.length
    };
  } catch (error) {
    Logger.log('Error in getTopicsForUserPage: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Check if user can access a topic (unlock logic)
 */
function checkTopicAccess(topicId) {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return {
        success: false,
        message: 'User not authenticated',
        unlocked: false
      };
    }

    var topicsResult = getAllTopicsIncludingHidden();
    if (!topicsResult.success) return topicsResult;

    var topics = topicsResult.topics || [];

    var topic = topics.find(function(t) {
      return String(t.topicId) === String(topicId);
    });

    if (!topic) {
      return {
        success: false,
        message: 'Không tìm thấy bài học.',
        unlocked: false
      };
    }

    // Chặn trực tiếp bài bị ẩn.
    if (isTopicHidden(topic)) {
      return {
        success: true,
        unlocked: false,
        hidden: true,
        reason: 'Bài học này đang được admin ẩn.',
        missingPrerequisites: []
      };
    }

    var topicMap = {};
    topics.forEach(function(t) {
      topicMap[String(t.topicId)] = t;
    });

    var progressResult = getUserTopicProgress();
    var progressMap =
      progressResult && progressResult.success
        ? progressResult.progress || {}
        : {};

    var access = evaluateTopicUnlock(topic, progressMap, topicMap);

    if (access.unlocked) {
      var grantReason = "normal";
      var grantPrereqIds = [];

      if (
        access.ignoredHiddenPrerequisites &&
        access.ignoredHiddenPrerequisites.length > 0
      ) {
        grantReason = "hidden_prerequisite";
        grantPrereqIds = access.ignoredHiddenPrerequisites.map(function(item) {
          return item.topicId;
        });
      }

      grantTopicAccessForUser_(topicId, grantReason, grantPrereqIds);
    }

    if (!access.unlocked) {
      return {
        success: true,
        unlocked: false,
        reason: access.reason,
        missingPrerequisites: access.missingPrerequisites || []
      };
    }

    return {
      success: true,
      unlocked: true,
      topic: topic
    };
  } catch (error) {
    Logger.log('Error in checkTopicAccess: ' + error.toString());
    return {
      success: false,
      message: error.toString(),
      unlocked: false
    };
  }
}

/**
 * Get topic statistics
 */
function getTopicStatistics(topicId) {
  try {
    const db = getOrCreateDatabase();

    // Count MCQ questions for this topic
    const mcqSheet = db.getSheetByName("MCQ_Questions");
    const matchingSheet = db.getSheetByName("Matching_Pairs");

    let mcqCount = 0;
    let matchingCount = 0;

    if (mcqSheet) {
      const mcqData = mcqSheet.getDataRange().getValues();
      mcqCount = mcqData.slice(1).filter((row) => row[1] === topicId).length;
    }

    if (matchingSheet) {
      const matchingData = matchingSheet.getDataRange().getValues();
      matchingCount = matchingData
        .slice(1)
        .filter((row) => row[1] === topicId).length;
    }

    return {
      success: true,
      statistics: {
        topicId: topicId,
        totalMCQ: mcqCount,
        totalMatching: matchingCount,
        totalQuestions: mcqCount + matchingCount,
      },
    };
  } catch (error) {
    Logger.log("Error in getTopicStatistics: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Lấy số lượt làm Mini Quiz hôm nay
 * @param {string} topicId
 */
function getMiniQuizAttempts(topicId) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "User not authenticated" };
    }
    const today = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
    const key = `MQ_ATTEMPTS_${userEmail}_${topicId}_${today}`;
    const props = PropertiesService.getUserProperties();
    const attempts = parseInt(props.getProperty(key) || "0");
    return {
      success: true,
      attempts: attempts,
      maxAttempts: 3,
      canPlay: attempts < 3
    };
  } catch(error) {
    Logger.log("Error in getMiniQuizAttempts: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Ghi nhận 1 lượt làm Mini Quiz hôm nay
 * @param {string} topicId
 */
function recordMiniQuizAttempt(topicId) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "User not authenticated" };
    }
    const today = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
    const key = `MQ_ATTEMPTS_${userEmail}_${topicId}_${today}`;
    const props = PropertiesService.getUserProperties();
    let attempts = parseInt(props.getProperty(key) || "0");
    
    if (attempts >= 3) {
      return { 
        success: false, 
        message: "Bạn đã hết 3 lượt chơi MiniQuiz cho bài học này hôm nay.", 
        attempts: attempts, 
        maxAttempts: 3 
      };
    }
    
    attempts++;
    props.setProperty(key, attempts.toString());
    
    return { 
      success: true, 
      attempts: attempts, 
      maxAttempts: 3, 
      remaining: 3 - attempts 
    };
  } catch(error) {
    Logger.log("Error in recordMiniQuizAttempt: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
