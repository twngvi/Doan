/**
 * topics.js - Topics Management Server-Side Functions
 *
 * Handles all topic-related operations: get topics, user progress, unlock logic
 */

// ⭐ CACHE phía server để giảm số lần đọc spreadsheet
let topicsCacheServer = null;
let topicsCacheTime = 0;
const TOPICS_CACHE_DURATION = 300000; // Cache 5 phút

/**
 * Get all topics from MASTER_DB
 * Updated to read 14 columns including contentDocId
 * ⭐ OPTIMIZED: Thêm cache phía server
 */
function getAllTopics() {
  Logger.log("=== BẮT ĐẦU HÀM getAllTopics ===");

  try {
    const now = Date.now();

    // ⭐ Kiểm tra cache phía server
    if (topicsCacheServer && now - topicsCacheTime < TOPICS_CACHE_DURATION) {
      Logger.log("✅ Using server-side cached topics");
      return topicsCacheServer;
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
    Logger.log("Last row: " + lastRow);

    if (lastRow < 2) {
      Logger.log("⚠️ No data rows found (only header or empty sheet)");
      return {
        success: true,
        topics: [],
        count: 0,
      };
    }

    // ⭐ ĐỌC 14 CỘT (A đến N) - Thêm cột contentDocId
    const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();

    Logger.log("Đã lấy được " + data.length + " dòng dữ liệu");

    const topics = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      if (!row[0]) {
        continue; // Skip empty rows silently for performance
      }

      topics.push({
        topicId: String(row[0]).trim(),
        title: String(row[1]),
        description: String(row[2]),
        category: String(row[3]),
        order: Number(row[4]) || 0,
        iconUrl: String(row[5] || ""),
        estimatedTime: String(row[6] || ""),
        prerequisiteTopics: String(row[7] || ""),
        isLocked: Boolean(row[8]),
        unlockCondition: String(row[9] || ""),
        createdBy: String(row[10] || ""),
        createdAt:
          row[11] instanceof Date
            ? row[11].toISOString()
            : String(row[11] || ""),
        updatedAt:
          row[12] instanceof Date
            ? row[12].toISOString()
            : String(row[12] || ""),

        // ⭐ THÊM CỘT CONTENT DOC ID
        contentDocId: String(row[13] || ""),

        // Map thêm trường cho Frontend hiển thị
        journey: mapCategoryToJourney(row[3]),
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
    topicsCacheServer = result;
    topicsCacheTime = now;

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
  topicsCacheServer = null;
  topicsCacheTime = 0;
  Logger.log("✅ Topics cache cleared");
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
          let progressPercent = 0;
          let completedCount = 0;
          const totalActivities = 4; // lesson, mindmap, flashcards, quiz
          if (lessonDone) completedCount++;
          if (mindmapDone) completedCount++;
          if (flashcardsDone) completedCount++;
          if (quizDone) completedCount++;
          progressPercent = Math.round(
            (completedCount / totalActivities) * 100,
          );

          progress[topicId] = {
            topicId: topicId,
            completed: lessonDone && mindmapDone && flashcardsDone && quizDone,
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
