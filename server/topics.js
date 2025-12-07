/**
 * topics.js - Topics Management Server-Side Functions
 *
 * Handles all topic-related operations: get topics, user progress, unlock logic
 */

/**
 * Get all topics from MASTER_DB
 */
function getAllTopics() {
  try {
    Logger.log("=== getAllTopics called ===");

    const db = getOrCreateDatabase();
    const sheet = db.getSheetByName("Topics");

    if (!sheet) {
      Logger.log("Topics sheet not found");
      return {
        success: false,
        message: "Topics sheet not found in database",
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Filter out empty rows and map to objects
    const topics = rows
      .filter((row) => row[0]) // Filter rows with topicId
      .map((row) => {
        return {
          topicId: row[0],
          title: row[1],
          description: row[2],
          category: row[3],
          order: row[4],
          iconUrl: row[5],
          estimatedTime: row[6],
          prerequisiteTopics: row[7],
          isLocked: row[8],
          unlockCondition: row[9],
          createdBy: row[10],
          createdAt: row[11],
          journey: mapCategoryToJourney(row[3]),
        };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order

    Logger.log(`Found ${topics.length} topics`);

    return {
      success: true,
      topics: topics,
      count: topics.length,
    };
  } catch (error) {
    Logger.log("Error in getAllTopics: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Helper function: Map category to journey level
 */
function mapCategoryToJourney(category) {
  const cat = (category || "").toString().toLowerCase();
  if (cat.includes("fundamental") || cat.includes("logic")) return "Beginner";
  if (
    cat.includes("control") ||
    cat.includes("data") ||
    cat.includes("programming")
  )
    return "Intermediate";
  if (cat.includes("algorithm") || cat.includes("advanced")) return "Advanced";
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
      (topic) => topic.journey === journey
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
    const session = getUserSession();

    if (!session.success || !session.user) {
      return {
        success: false,
        message: "User not logged in",
      };
    }

    const userId = session.user.userId;
    Logger.log("Getting topic progress for user: " + userId);

    // Get user's personal sheet
    const userSheet = findUserProgressSheet(userId);

    if (!userSheet) {
      Logger.log("User progress sheet not found");
      return {
        success: true,
        progress: {}, // Empty progress for new users
      };
    }

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

    // Map progress data
    const progress = {};
    rows.forEach((row) => {
      if (row[0]) {
        // Has topicId
        const topicId = row[0];
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
    const session = getUserSession();

    if (!session.success || !session.user) {
      return {
        success: false,
        message: "User not logged in",
      };
    }

    const userId = session.user.userId;
    Logger.log(`Updating topic progress for user ${userId}, topic ${topicId}`);

    // Get or create user's personal sheet
    let userSheet = findUserProgressSheet(userId);

    if (!userSheet) {
      // Create personal sheet if it doesn't exist
      const createResult = createUserPersonalSheet(userId);
      if (!createResult.success) {
        return createResult;
      }
      userSheet = SpreadsheetApp.openById(createResult.sheetId);
    }

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
    const session = getUserSession();

    if (!session.success || !session.user) {
      return {
        success: false,
        message: "User not logged in",
        unlocked: false,
      };
    }

    const topicResult = getTopicById(topicId);

    if (!topicResult.success) {
      return topicResult;
    }

    const topic = topicResult.topic;
    const user = session.user;

    // Check AI level requirement
    const userAILevel = user.aiLevel || 1;
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
