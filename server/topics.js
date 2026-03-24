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
function getAllTopics() {
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
            ? Boolean(row[col.isLocked])
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

    topics.sort((a, b) => (a.order || 0) - (b.order || 0));

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
        const statusIdx = headers.indexOf("status");
        const completedAtIdx = headers.indexOf("completedAt");

        if (lessonCompletedIdx >= 0) {
          // New schema - ⭐ FIX: Handle string/number/boolean values from spreadsheet
          var isChecked = function (val) {
            return val === 1 || val === true || val === "1" || val === "TRUE";
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

          progress[topicId] = {
            topicId: topicId,
            completed:
              lessonDone && mindmapDone && flashcardsDone && miniQuizDone,
            progress: progressPercent,
            lessonCompleted: lessonDone,
            mindmapViewed: mindmapDone,
            flashcardsCompleted: flashcardsDone,
            quizDone: quizDone,
            miniQuizCompleted: miniQuizDone,
            status: statusIdx >= 0 ? row[statusIdx] : "in_progress",
            completedAt: completedAtIdx >= 0 ? row[completedAtIdx] : null,
          };
        } else {
          // Old schema fallback
          progress[topicId] = {
            topicId: topicId,
            completed: row[1] === true || row[1] === "TRUE",
            progress: parseFloat(row[2]) || 0,
            stagesCompleted: parseInt(row[3]) || 0,
            totalStages: parseInt(row[4]) || 0,
            lastAccessed: row[5],
            completedAt: row[6],
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
function checkTopicAccess(topicId) {
  try {
    // ⭐ FIX: Use Session.getActiveUser() instead of broken getUserSession() call
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return {
        success: false,
        message: "User not authenticated",
        unlocked: false,
      };
    }

    const topicResult = getTopicById(topicId);

    if (!topicResult.success) {
      return topicResult;
    }

    const topic = topicResult.topic;

    // Check AI level requirement
    const userAILevel = 1; // TODO: get from user data if needed
    const minAILevel = topic.minAILevel || 1;

    if (userAILevel < minAILevel) {
      return {
        success: true,
        unlocked: false,
        reason: `Requires AI Level ${minAILevel}. Your current level: ${userAILevel}`,
      };
    }

    // Check accuracy requirement
    const minAccuracy = topic.minAccuracy || 0;

    if (minAccuracy > 0) {
      // TODO: Calculate user's overall accuracy from progress sheet
      // For now, allow access if AI level is met
    }

    return {
      success: true,
      unlocked: true,
      topic: topic,
    };
  } catch (error) {
    Logger.log("Error in checkTopicAccess: " + error.toString());
    return {
      success: false,
      message: error.toString(),
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
