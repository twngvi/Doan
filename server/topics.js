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
      xpReward: headers.indexOf("xpReward"),
      quizXpReward: headers.indexOf("quizXpReward"),
      matchingXpReward: headers.indexOf("matchingXpReward"),
      mindmapStatus: headers.indexOf("mindmapStatus"),
      matchingStatus: headers.indexOf("matchingStatus"),
      isHidden: headers.indexOf("isHidden"),
      status: headers.indexOf("status"),
      courseId: headers.indexOf("courseId")
    };

    const aiCacheMap = {};
    try {
      const aiSheet = ss.getSheetByName("AI_Content_Cache");
      if (aiSheet && aiSheet.getLastRow() > 1) {
        const aiData = aiSheet.getRange(2, 1, aiSheet.getLastRow() - 1, 4).getValues();
        for (let k = 0; k < aiData.length; k++) {
          if (aiData[k][1] && aiData[k][3]) {
            aiCacheMap[String(aiData[k][1]).trim() + "_" + String(aiData[k][3]).trim()] = true;
          }
        }
      }
    } catch (e) {}

    const quizCountMap = {};
    try {
      const qSheet = ss.getSheetByName("MCQ_Questions") || ss.getSheetByName("Questions");
      if (qSheet && qSheet.getLastRow() > 1) {
        const qData = qSheet.getDataRange().getValues();
        const headers = qData[0] || [];
        let tidCol = headers.indexOf("topicId");
        let statusCol = headers.indexOf("status");
        if (tidCol < 0) tidCol = 1;

        for (let k = 1; k < qData.length; k++) {
          const qStatus = statusCol >= 0 ? String(qData[k][statusCol] || "").trim().toLowerCase() : "approved";
          if (qStatus !== "deleted") {
            const qTid = String(qData[k][tidCol] || "").trim();
            if (qTid) {
              quizCountMap[qTid] = (quizCountMap[qTid] || 0) + 1;
            }
          }
        }
      }
    } catch (e) {}

    const matchingCountMap = {};
    try {
      const mSheet = ss.getSheetByName("Matching_Term_Cards");
      if (mSheet && mSheet.getLastRow() > 1) {
        const mData = mSheet.getDataRange().getValues();
        const headers = mData[0] || [];
        let tidCol = headers.indexOf("topicId");
        let statusCol = headers.indexOf("status");
        if (tidCol < 0) tidCol = 1;

        for (let k = 1; k < mData.length; k++) {
          const mStatus = statusCol >= 0 ? String(mData[k][statusCol] || "").trim().toLowerCase() : "approved";
          if (mStatus !== "deleted") {
            const mTid = String(mData[k][tidCol] || "").trim();
            if (mTid) {
              matchingCountMap[mTid] = (matchingCountMap[mTid] || 0) + 1;
            }
          }
        }
      }
    } catch (e) {}

    const topics = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      const topicId =
        col.topicId >= 0 && row[col.topicId] ? String(row[col.topicId]).trim() : "";

      if (!topicId) {
        continue; // Skip empty rows silently for performance
      }

      const contentDocIdVal =
        col.contentDocId >= 0 && row[col.contentDocId] !== undefined
          ? String(row[col.contentDocId] || "").trim()
          : "";
      const quizStatusVal =
        col.quizStatus >= 0 && row[col.quizStatus] !== undefined
          ? String(row[col.quizStatus] || "need_questions").trim()
          : "need_questions";
      const mindmapStatusVal =
        col.mindmapStatus >= 0 && row[col.mindmapStatus] !== undefined
          ? String(row[col.mindmapStatus] || "").trim()
          : "";
      const matchingStatusVal =
        col.matchingStatus >= 0 && row[col.matchingStatus] !== undefined
          ? String(row[col.matchingStatus] || "").trim()
          : "";
      const isHiddenVal =
        col.isHidden >= 0 && row[col.isHidden] !== undefined
          ? (row[col.isHidden] === true || String(row[col.isHidden]).toLowerCase() === "true" || row[col.isHidden] === 1)
          : false;
      const statusColVal =
        col.status >= 0 && row[col.status] !== undefined
          ? String(row[col.status] || "").toLowerCase()
          : "";

      const hasTheory = Boolean(contentDocIdVal && contentDocIdVal.length > 5);
      const hasMindmap = Boolean(mindmapStatusVal === "ready" || mindmapStatusVal === "active" || aiCacheMap[topicId + "_mindmap"]);
      const hasQuiz = Boolean(quizStatusVal === "active" || quizStatusVal === "ready" || quizCountMap[topicId] >= 1);
      const hasMatching = Boolean(matchingStatusVal === "ready" || matchingStatusVal === "active" || aiCacheMap[topicId + "_matching"] || matchingCountMap[topicId] >= 1);

      let publishStatus = "draft";
      if (isHiddenVal || statusColVal === "hidden") {
        publishStatus = "hidden";
      } else if (hasTheory && hasMindmap && hasQuiz && hasMatching) {
        publishStatus = "published";
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
        courseId:
          col.courseId >= 0 && row[col.courseId] !== undefined
            ? String(row[col.courseId] || "")
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

        contentDocId: contentDocIdVal,
        contentDocUrl:
          col.contentDocUrl >= 0 && row[col.contentDocUrl] !== undefined
            ? String(row[col.contentDocUrl] || "")
            : "",
        quizStatus: quizStatusVal,
        mindmapStatus: hasMindmap ? "ready" : "draft",
        matchingStatus: hasMatching ? "ready" : "draft",
        isHidden: isHiddenVal || statusColVal === "hidden",
        publishStatus: publishStatus,
        hasTheory: hasTheory,
        hasMindmap: hasMindmap,
        hasQuiz: hasQuiz,
        hasMatching: hasMatching,

        xpReward:
          col.xpReward >= 0 && row[col.xpReward] !== undefined && row[col.xpReward] !== ""
            ? Number(row[col.xpReward]) || 100
            : 100,
        quizXpReward:
          col.quizXpReward >= 0 && row[col.quizXpReward] !== undefined && row[col.quizXpReward] !== ""
            ? Number(row[col.quizXpReward]) || 100
            : 100,
        matchingXpReward:
          col.matchingXpReward >= 0 && row[col.matchingXpReward] !== undefined && row[col.matchingXpReward] !== ""
            ? Number(row[col.matchingXpReward]) || 100
            : 100,

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
      const courseA = String(a.courseId || '');
      const courseB = String(b.courseId || '');
      
      if (courseA !== courseB) {
        return courseA.localeCompare(courseB, 'vi');
      }
      
      const orderA = Number(a.order) || 999;
      const orderB = Number(b.order) || 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

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
    const cache = CacheService.getScriptCache();
    cache.remove(TOPICS_CACHE_KEY);
    Logger.log("Đã xóa cache server-side: " + TOPICS_CACHE_KEY);
  } catch (e) {
    Logger.log("Lỗi khi xóa cache: " + e.toString());
  }
}

/**
 * Xóa cả cache Topics và Courses
 */
function clearCourseStructureCaches() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(TOPICS_CACHE_KEY);
    cache.remove("ALL_COURSES_CACHE");
    Logger.log("Topics and Courses cache cleared.");
  } catch (error) {
    Logger.log("Không thể xóa cache: " + error.toString());
  }
}

function isTopicHidden(topic) {
  if (!topic) return false;

  return (
    topic.publishStatus !== "published" ||
    topic.isHidden === true ||
    topic.publishStatus === "hidden" ||
    topic.publishStatus === "draft"
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
function getTopicById(topicId, includeHidden = false) {
  try {
    Logger.log("Getting topic: " + topicId);

    const result = includeHidden ? getAllTopicsIncludingHidden() : getAllTopics();

    if (!result.success) {
      return result;
    }

    const searchId = String(topicId).trim();
    const topic = result.topics.find((t) => t.topicId === searchId);

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
          const totalActivities = 6; // lesson, mindmap, flashcards, miniQuiz, quiz, matching
          if (lessonDone) completedCount++;
          if (mindmapDone) completedCount++;
          if (flashcardsDone) completedCount++;
          if (miniQuizDone) completedCount++;
          if (quizDone) completedCount++;
          if (matchingDone) completedCount++;
          progressPercent = Math.round(
            (completedCount / totalActivities) * 100,
          );

          const topic = topicMap[topicId];
          const quizRequired = topic && topic.quizStatus === "active";
          const matchingRequired = topic && topic.matchingStatus === "active";

          progress[topicId] = {
            topicId: topicId,
            completed:
              lessonDone && mindmapDone && flashcardsDone && miniQuizDone && (!quizRequired || quizDone) && (!matchingRequired || matchingDone),
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

    visibleTopics.sort(function(a, b) {
      var catA = normalizeCategoryName(a.category);
      var catB = normalizeCategoryName(b.category);

      if (catA !== catB) {
        return catA.localeCompare(catB, 'vi');
      }

      return (a.rowIndex || 0) - (b.rowIndex || 0);
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

    var enhancedTopics = visibleTopics.map(function(topic, index) {
      // Inject implicit sequential prerequisite if topic is locked and has no explicit prerequisites
      if (topic.isLocked) {
        var conditionObj = getUnlockConditionObject(topic);
        var hasExplicitPrereqs = conditionObj && conditionObj.prerequisiteTopicIds && conditionObj.prerequisiteTopicIds.length > 0;
        
        if (!hasExplicitPrereqs && index > 0) {
          var prevTopic = visibleTopics[index - 1];
          if (prevTopic) {
            topic.prerequisiteTopics = String(prevTopic.topicId);
          }
        }
      }

      var access = evaluateTopicUnlock(topic, progressMap, topicMap);

      return Object.assign({}, topic, {
        unlocked: access.unlocked,
        lockedReason: access.reason,
        missingPrerequisites: access.missingPrerequisites || [],
        ignoredHiddenPrerequisites: access.ignoredHiddenPrerequisites || []
      });
    });

    // ⭐ Also load courses data to send along
    var coursesData = [];
    try {
      var SPREADSHEET_ID = "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var coursesSheet = ss.getSheetByName("Courses");
      if (coursesSheet && coursesSheet.getLastRow() >= 2) {
        var cData = coursesSheet.getDataRange().getValues();
        var cHeaders = cData[0];
        var cCol = {};
        cHeaders.forEach(function(h, i) { cCol[String(h).trim()] = i; });
        
        for (var ci = 1; ci < cData.length; ci++) {
          var crow = cData[ci];
          var cid = cCol.courseId !== undefined ? crow[cCol.courseId] : null;
          if (!cid) continue;
          var cStatus = cCol.status !== undefined ? String(crow[cCol.status] || "").trim().toLowerCase() : "draft";
          if (cStatus !== "published" && cStatus !== "active") continue;
          
          coursesData.push({
            courseId: String(cid),
            title: cCol.title !== undefined ? String(crow[cCol.title] || "") : "",
            shortDescription: cCol.shortDescription !== undefined ? String(crow[cCol.shortDescription] || "") : "",
            description: cCol.description !== undefined ? String(crow[cCol.description] || "") : "",
            thumbnailUrl: cCol.thumbnailUrl !== undefined ? String(crow[cCol.thumbnailUrl] || "") : "",
            level: cCol.level !== undefined ? String(crow[cCol.level] || "") : "",
            category: cCol.category !== undefined ? String(crow[cCol.category] || "") : "",
            order: cCol.order !== undefined ? Number(crow[cCol.order]) || 0 : 0,
            status: cStatus
          });
        }
        
        coursesData.sort(function(a, b) {
          return (a.order || 0) - (b.order || 0);
        });
      }
    } catch(courseErr) {
      Logger.log("Warning: Could not load courses: " + courseErr.toString());
    }

    return {
      success: true,
      topics: enhancedTopics,
      progress: progressMap,
      courses: coursesData,
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

/**
 * Get all courses for Admin
 */
function getAllCoursesForAdmin() {
  Logger.log("=== BẮT ĐẦU HÀM getAllCoursesForAdmin ===");

  try {
    const adminContext = requireAdminContext_();
    if (!adminContext.success) {
      return adminContext;
    }

    const cache = CacheService.getScriptCache();
    const cachedCourses = cache.get("ALL_COURSES_CACHE");
    
    if (cachedCourses) {
      Logger.log("✅ Using server-side cached courses (CacheService)");
      return { success: true, courses: JSON.parse(cachedCourses) };
    }

    const SPREADSHEET_ID = typeof DB_CONFIG !== 'undefined' && DB_CONFIG.SPREADSHEET_ID ? DB_CONFIG.SPREADSHEET_ID : "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Đọc courses
    let coursesSheet = null;
    try {
      coursesSheet = ss.getSheetByName(DB_CONFIG.SHEETS.COURSES.name);
    } catch(e) {
      coursesSheet = ss.getSheetByName("Courses");
    }
    
    if (!coursesSheet) {
      return { success: false, message: "Sheet Courses không tồn tại." };
    }
    
    const coursesData = coursesSheet.getDataRange().getValues();
    if (coursesData.length < 2) return { success: true, courses: [] };
    
    const cHeaders = coursesData[0];
    const cCol = {};
    cHeaders.forEach((h, i) => { cCol[h] = i; });
    
    const courses = [];
    for (let i = 1; i < coursesData.length; i++) {
      const row = coursesData[i];
      const courseId = row[cCol.courseId];
      if (!courseId) continue;
      
      courses.push({
        courseId: courseId,
        title: row[cCol.title] || "",
        shortDescription: row[cCol.shortDescription] || "",
        description: row[cCol.description] || "",
        thumbnailUrl: row[cCol.thumbnailUrl] || "",
        level: row[cCol.level] || "",
        category: row[cCol.category] || "",
        order: Number(row[cCol.order]) || 0,
        status: row[cCol.status] || "draft",
        estimatedTime: row[cCol.estimatedTime] || "",
        prerequisiteCourseIds: row[cCol.prerequisiteCourseIds] || "",
        unlockCondition: row[cCol.unlockCondition] || "",
        // Khởi tạo các mảng để đếm topics sau này
        totalTopics: 0,
        publishedTopics: 0,
        draftTopics: 0,
        hiddenTopics: 0
      });
    }
    
    // Đọc topics để đếm
    const topicsRes = getAllTopicsIncludingHidden();
    const topicsList = topicsRes && !topicsRes.success && topicsRes.topics === undefined ? [] : (topicsRes.topics || topicsRes);
    
    const courseMap = {};
    courses.forEach(c => courseMap[c.courseId] = c);
    
    topicsList.forEach(function(topic) {
      if (!topic) return;

      const topicId = String(topic.topicId || "").trim();
      const title = String(topic.title || "").trim();
      const courseId = String(topic.courseId || "").trim();

      if (!topicId) return;

      if (title === "DUMMY_COURSE_HOLDER" || topicId.indexOf("course_holder_") === 0) {
        return;
      }

      if (courseId && courseMap[courseId]) {
        courseMap[courseId].totalTopics++;
        if (topic.publishStatus === "published") {
          courseMap[courseId].publishedTopics++;
        } else if (topic.publishStatus === "hidden") {
          courseMap[courseId].hiddenTopics++;
        } else {
          courseMap[courseId].draftTopics++;
        }
      }
    });

    try {
      cache.put("ALL_COURSES_CACHE", JSON.stringify(courses), TOPICS_CACHE_DURATION);
    } catch(e) {
      Logger.log("Could not cache courses: " + e.toString());
    }

    return { success: true, courses: courses };
  } catch (error) {
    Logger.log("❌ Lỗi trong getAllCoursesForAdmin: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get topics by course ID
 */
function getTopicsByCourseForAdmin(courseId) {
  try {
    const adminContext = requireAdminContext_();
    if (!adminContext.success) {
      return adminContext;
    }
    
    const topicsRes = getAllTopicsIncludingHidden();
    const allTopics = topicsRes && !topicsRes.success && topicsRes.topics === undefined ? [] : (topicsRes.topics || topicsRes);
    
    if (!Array.isArray(allTopics)) return { success: true, topics: [] };
    
    const topics = allTopics.filter(t => t.courseId === courseId);
    return { success: true, topics: topics };
  } catch (error) {
    Logger.log("❌ Lỗi trong getTopicsByCourseForAdmin: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get all courses for User Page (only published/active ones)
 */
function getCoursesForUserPage() {
  try {
    Logger.log("=== getCoursesForUserPage START ===");
    
    const cache = CacheService.getScriptCache();
    const cachedCourses = cache.get("ALL_COURSES_CACHE_V3");
    
    let allCourses = [];
    if (cachedCourses) {
      Logger.log("Using cached courses");
      allCourses = JSON.parse(cachedCourses);
    } else {
      // Use the SAME spreadsheet ID as getAllTopicsIncludingHidden
      const SPREADSHEET_ID = "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      
      const coursesSheet = ss.getSheetByName("Courses");
      
      if (!coursesSheet) {
        Logger.log("❌ Sheet 'Courses' not found");
        return { success: true, courses: [] };
      }
      
      const coursesData = coursesSheet.getDataRange().getValues();
      Logger.log("Courses sheet rows: " + coursesData.length);
      
      if (coursesData.length < 2) return { success: true, courses: [] };
      
      const cHeaders = coursesData[0];
      const cCol = {};
      cHeaders.forEach((h, i) => { cCol[String(h).trim()] = i; });
      
      Logger.log("Courses headers: " + JSON.stringify(cHeaders));
      Logger.log("Courses column map: " + JSON.stringify(cCol));
      
      for (let i = 1; i < coursesData.length; i++) {
        const row = coursesData[i];
        const courseId = cCol.courseId !== undefined ? row[cCol.courseId] : null;
        if (!courseId) continue;
        
        const status = cCol.status !== undefined ? String(row[cCol.status] || "").trim() : "draft";
        Logger.log("Course " + i + ": id=" + courseId + ", title=" + (cCol.title !== undefined ? row[cCol.title] : "") + ", status=" + status);
        
        allCourses.push({
          courseId: String(courseId),
          title: cCol.title !== undefined ? String(row[cCol.title] || "") : "",
          shortDescription: cCol.shortDescription !== undefined ? String(row[cCol.shortDescription] || "") : "",
          description: cCol.description !== undefined ? String(row[cCol.description] || "") : "",
          thumbnailUrl: cCol.thumbnailUrl !== undefined ? String(row[cCol.thumbnailUrl] || "") : "",
          level: cCol.level !== undefined ? String(row[cCol.level] || "") : "",
          category: cCol.category !== undefined ? String(row[cCol.category] || "") : "",
          order: cCol.order !== undefined ? Number(row[cCol.order]) || 0 : 0,
          status: status.toLowerCase(),
          estimatedTime: cCol.estimatedTime !== undefined ? String(row[cCol.estimatedTime] || "") : "",
          createdAt: cCol.createdAt !== undefined ? String(row[cCol.createdAt] || "") : "",
          updatedAt: cCol.updatedAt !== undefined ? String(row[cCol.updatedAt] || "") : ""
        });
      }
      
      Logger.log("Total courses parsed: " + allCourses.length);
      
      // Save to cache for 15 minutes
      try {
        cache.put("ALL_COURSES_CACHE_V3", JSON.stringify(allCourses), 900);
      } catch(e) {
        Logger.log("Cache put error: " + e.toString());
      }
    }
    
    // Filter out draft/hidden courses for regular users
    const visibleCourses = allCourses.filter(c => {
      const st = String(c.status || "").toLowerCase().trim();
      return st === "published" || st === "active";
    });
    
    Logger.log("Visible courses (published/active): " + visibleCourses.length);
    
    // Sort courses
    visibleCourses.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || "").localeCompare(b.category || "", "vi");
      }
      return (a.order || 0) - (b.order || 0);
    });
    
    Logger.log("=== getCoursesForUserPage END - returning " + visibleCourses.length + " courses ===");
    return { success: true, courses: visibleCourses };
  } catch (error) {
    Logger.log("❌ Lỗi trong getCoursesForUserPage: " + error.toString());
    Logger.log("Stack: " + error.stack);
    return { success: false, message: error.toString() };
  }
}

