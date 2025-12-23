/**
 * userDb.js - User Personal Database Management
 *
 * Chứa các hàm quản lý USER_DB: create user sheets, manage user data
 */

/**
 * Create personal sheet for user
 */
function createUserPersonalSheet(userId, username) {
  try {
    Logger.log("Creating personal sheet for user: " + userId);

    const existingSheetId = findUserProgressSheet(userId);
    if (existingSheetId) {
      Logger.log("User already has sheet: " + existingSheetId);
      return existingSheetId;
    }

    const sheetName = USER_DB_CONFIG.SHEET_NAME_PREFIX + userId;
    const userSpreadsheet = SpreadsheetApp.create(sheetName);
    const spreadsheetId = userSpreadsheet.getId();

    Logger.log("Created new sheet: " + spreadsheetId);

    // Move to specific folder
    try {
      const folder = DriveApp.getFolderById(DB_CONFIG.USER_SHEETS_FOLDER_ID);
      const file = DriveApp.getFileById(spreadsheetId);

      // Remove from root folder
      const parents = file.getParents();
      while (parents.hasNext()) {
        const parent = parents.next();
        parent.removeFile(file);
      }

      // Add to user sheets folder
      folder.addFile(file);
      Logger.log("Moved sheet to folder: " + DB_CONFIG.USER_SHEETS_FOLDER_ID);
    } catch (folderError) {
      Logger.log(
        "Warning: Could not move to folder: " + folderError.toString()
      );
      // Continue even if moving fails
    }

    // Delete default sheet
    const defaultSheet = userSpreadsheet.getSheets()[0];
    if (defaultSheet && defaultSheet.getName() !== "Profile") {
      try {
        userSpreadsheet.deleteSheet(defaultSheet);
      } catch (e) {
        Logger.log("Could not delete default sheet: " + e.toString());
      }
    }

    // Create all sheets
    Object.values(USER_DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      createUserSheet(userSpreadsheet, sheetConfig);
    });

    // Initialize Profile
    initializeUserProfile(userSpreadsheet, userId, username);

    // Update MASTER_DB with sheet ID
    updateUserProgressSheetId(userId, spreadsheetId);

    Logger.log("Personal sheet created successfully: " + spreadsheetId);
    return spreadsheetId;
  } catch (error) {
    Logger.log("Error creating personal sheet: " + error.toString());
    throw error;
  }
}

/**
 * Create sheet in user's spreadsheet
 */
function createUserSheet(spreadsheet, sheetConfig) {
  try {
    let sheet = spreadsheet.getSheetByName(sheetConfig.name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetConfig.name);
      Logger.log("Created sheet: " + sheetConfig.name);
    }

    const headerRange = sheet.getRange(1, 1, 1, sheetConfig.columns.length);
    headerRange.setValues([sheetConfig.columns]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#34a853");
    headerRange.setFontColor("white");

    sheet.autoResizeColumns(1, sheetConfig.columns.length);
    sheet.setFrozenRows(1);

    return sheet;
  } catch (error) {
    Logger.log(
      "Error creating user sheet " + sheetConfig.name + ": " + error.toString()
    );
    throw error;
  }
}

/**
 * Initialize user profile
 */
function initializeUserProfile(spreadsheet, userId, username) {
  try {
    const profileSheet = spreadsheet.getSheetByName("Profile");
    if (!profileSheet) return;

    const timestamp = new Date();

    const profileData = [
      userId,
      username,
      1,
      0,
      1,
      1,
      0,
      0,
      0,
      timestamp,
      timestamp,
    ];

    profileSheet.getRange(2, 1, 1, profileData.length).setValues([profileData]);
    Logger.log("Profile initialized for user: " + userId);
  } catch (error) {
    Logger.log("Error initializing profile: " + error.toString());
  }
}

/**
 * Update user's progress sheet ID in MASTER_DB
 */
function updateUserProgressSheetId(userId, progressSheetId) {
  try {
    const spreadsheet = getOrCreateDatabase();
    const usersSheet = spreadsheet.getSheetByName("Users");

    if (!usersSheet) {
      throw new Error("Users sheet not found in MASTER_DB");
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const progressSheetIdIndex = headers.indexOf("progressSheetId");

    if (progressSheetIdIndex === -1) {
      throw new Error("Column progressSheetId not found");
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        usersSheet
          .getRange(i + 1, progressSheetIdIndex + 1)
          .setValue(progressSheetId);
        Logger.log("Updated progressSheetId for user: " + userId);
        return;
      }
    }

    Logger.log("User not found: " + userId);
  } catch (error) {
    Logger.log("Error updating progressSheetId: " + error.toString());
  }
}

/**
 * Find user's progress sheet
 */
function findUserProgressSheet(userId) {
  try {
    const spreadsheet = getOrCreateDatabase();
    const usersSheet = spreadsheet.getSheetByName("Users");

    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      const headers = data[0];
      const progressSheetIdIndex = headers.indexOf("progressSheetId");

      if (progressSheetIdIndex !== -1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === userId && data[i][progressSheetIdIndex]) {
            return data[i][progressSheetIdIndex];
          }
        }
      }
    }

    const sheetName = USER_DB_CONFIG.SHEET_NAME_PREFIX + userId;
    const files = DriveApp.getFilesByName(sheetName);

    if (files.hasNext()) {
      const file = files.next();
      Logger.log("Found sheet in Drive: " + file.getId());
      return file.getId();
    }

    return null;
  } catch (error) {
    Logger.log("Error finding user sheet: " + error.toString());
    return null;
  }
}

/**
 * Get user spreadsheet object
 */
function getUserSpreadsheet(userId) {
  try {
    const spreadsheetId = findUserProgressSheet(userId);
    if (!spreadsheetId) {
      Logger.log("User doesn't have sheet: " + userId);
      return null;
    }

    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    Logger.log("Error opening user spreadsheet: " + error.toString());
    return null;
  }
}

// ========== AI LEARNING SYSTEM - USER DB OPERATIONS ==========

/**
 * Ensure AI Learning sheets exist for user
 * @param {string} userId
 */
function ensureAILearningSheetsExist(userId) {
  try {
    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) {
      Logger.log("Cannot find user spreadsheet: " + userId);
      return false;
    }

    const aiSheets = [
      USER_DB_CONFIG.SHEETS.WRONG_ANSWER_MEMORY,
      USER_DB_CONFIG.SHEETS.AI_LEARNING_SESSIONS,
      USER_DB_CONFIG.SHEETS.FLASHCARD_PROGRESS,
    ];

    aiSheets.forEach((sheetConfig) => {
      if (!spreadsheet.getSheetByName(sheetConfig.name)) {
        createUserSheet(spreadsheet, sheetConfig);
        Logger.log("Created AI sheet for user: " + sheetConfig.name);
      }
    });

    return true;
  } catch (error) {
    Logger.log("Error ensuring AI sheets: " + error.toString());
    return false;
  }
}

// ========== WRONG ANSWER MEMORY OPERATIONS ==========

const WrongAnswerMemory = {
  /**
   * Thêm câu sai vào memory
   * @param {string} userId
   * @param {Object} wrongData
   * @returns {string} memoryId
   */
  add: function (userId, wrongData) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) throw new Error("User spreadsheet not found");

      ensureAILearningSheetsExist(userId);
      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) throw new Error("Wrong_Answer_Memory sheet not found");

      // Check nếu đã tồn tại
      const existing = this.findByQuestion(userId, wrongData.questionId);
      if (existing) {
        // Update wrong count
        return this.incrementWrongCount(userId, existing.memoryId);
      }

      const memoryId =
        "WAM_" +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 6);
      const timestamp = new Date();
      const nextReview = calculateNextReviewDate(0); // Stage 0 = 1 giờ

      const row = [
        memoryId,
        wrongData.questionId,
        wrongData.topicId,
        wrongData.conceptId || "",
        wrongData.questionText || "",
        wrongData.userAnswer || "",
        wrongData.correctAnswer || "",
        1, // wrongCount = 1
        timestamp, // lastAttempt
        nextReview, // nextReviewDate
        0, // reviewStage = 0 (1h)
        calculateWrongAnswerPriority(1, timestamp), // priority
        false, // isCleared
        "", // clearedAt
        JSON.stringify([wrongData.questionId]), // variantsAttempted
        "", // notes
      ];

      sheet.appendRow(row);
      Logger.log("✅ Added wrong answer for user " + userId + ": " + memoryId);
      return memoryId;
    } catch (error) {
      Logger.log("Error adding wrong answer: " + error.toString());
      throw error;
    }
  },

  /**
   * Tìm wrong answer theo questionId
   * @param {string} userId
   * @param {string} questionId
   * @returns {Object|null}
   */
  findByQuestion: function (userId, questionId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return null;

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (
          data[i][headers.indexOf("questionId")] === questionId &&
          !data[i][headers.indexOf("isCleared")]
        ) {
          const item = {};
          headers.forEach((h, idx) => {
            item[h] = data[i][idx];
          });
          item._rowIndex = i + 1;
          return item;
        }
      }

      return null;
    } catch (error) {
      Logger.log("Error finding wrong answer: " + error.toString());
      return null;
    }
  },

  /**
   * Tăng wrong count
   * @param {string} userId
   * @param {string} memoryId
   * @returns {string} memoryId
   */
  incrementWrongCount: function (userId, memoryId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return null;

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === memoryId) {
          const wrongCountCol = headers.indexOf("wrongCount");
          const lastAttemptCol = headers.indexOf("lastAttempt");
          const nextReviewCol = headers.indexOf("nextReviewDate");
          const reviewStageCol = headers.indexOf("reviewStage");
          const priorityCol = headers.indexOf("priority");

          const newWrongCount = (data[i][wrongCountCol] || 0) + 1;
          const timestamp = new Date();
          const nextReview = calculateNextReviewDate(0); // Reset về stage 0
          const priority = calculateWrongAnswerPriority(
            newWrongCount,
            timestamp
          );

          sheet.getRange(i + 1, wrongCountCol + 1).setValue(newWrongCount);
          sheet.getRange(i + 1, lastAttemptCol + 1).setValue(timestamp);
          sheet.getRange(i + 1, nextReviewCol + 1).setValue(nextReview);
          sheet.getRange(i + 1, reviewStageCol + 1).setValue(0);
          sheet.getRange(i + 1, priorityCol + 1).setValue(priority);

          Logger.log(
            "Updated wrong count: " + memoryId + " -> " + newWrongCount
          );
          return memoryId;
        }
      }

      return null;
    } catch (error) {
      Logger.log("Error incrementing wrong count: " + error.toString());
      return null;
    }
  },

  /**
   * Đánh dấu đã trả lời đúng (clear)
   * @param {string} userId
   * @param {string} memoryId
   */
  markCleared: function (userId, memoryId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return;

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === memoryId) {
          const isClearedCol = headers.indexOf("isCleared");
          const clearedAtCol = headers.indexOf("clearedAt");

          sheet.getRange(i + 1, isClearedCol + 1).setValue(true);
          sheet.getRange(i + 1, clearedAtCol + 1).setValue(new Date());

          Logger.log("✅ Cleared wrong answer: " + memoryId);
          break;
        }
      }
    } catch (error) {
      Logger.log("Error marking cleared: " + error.toString());
    }
  },

  /**
   * Cập nhật review stage (spaced repetition)
   * @param {string} userId
   * @param {string} memoryId
   */
  advanceReviewStage: function (userId, memoryId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return;

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === memoryId) {
          const reviewStageCol = headers.indexOf("reviewStage");
          const nextReviewCol = headers.indexOf("nextReviewDate");
          const priorityCol = headers.indexOf("priority");

          const currentStage = data[i][reviewStageCol] || 0;
          const newStage = Math.min(
            currentStage + 1,
            AI_CONFIG.SPACED_REPETITION_HOURS.length - 1
          );
          const nextReview = calculateNextReviewDate(newStage);

          // Giảm priority khi tiến bộ
          const currentPriority = data[i][priorityCol] || 3;
          const newPriority = Math.max(1, currentPriority - 1);

          sheet.getRange(i + 1, reviewStageCol + 1).setValue(newStage);
          sheet.getRange(i + 1, nextReviewCol + 1).setValue(nextReview);
          sheet.getRange(i + 1, priorityCol + 1).setValue(newPriority);

          Logger.log(
            "Advanced review stage: " + memoryId + " -> Stage " + newStage
          );

          // Nếu đã đến stage cuối và đúng, mark cleared
          if (newStage >= AI_CONFIG.SPACED_REPETITION_HOURS.length - 1) {
            this.markCleared(userId, memoryId);
          }

          break;
        }
      }
    } catch (error) {
      Logger.log("Error advancing review stage: " + error.toString());
    }
  },

  /**
   * Lấy danh sách câu cần ôn lại (đến hạn review)
   * @param {string} userId
   * @param {string} topicId - optional, nếu null lấy tất cả
   * @returns {Array}
   */
  getDueForReview: function (userId, topicId = null) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return [];

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const now = new Date();
      const results = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const isCleared = row[headers.indexOf("isCleared")];
        const nextReview = new Date(row[headers.indexOf("nextReviewDate")]);
        const rowTopicId = row[headers.indexOf("topicId")];

        if (!isCleared && nextReview <= now) {
          if (!topicId || rowTopicId === topicId) {
            const item = {};
            headers.forEach((h, idx) => {
              item[h] = row[idx];
            });
            results.push(item);
          }
        }
      }

      // Sort by priority (cao trước)
      results.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      return results;
    } catch (error) {
      Logger.log("Error getting due reviews: " + error.toString());
      return [];
    }
  },

  /**
   * Lấy tất cả wrong answers cho một topic
   * @param {string} userId
   * @param {string} topicId
   * @returns {Array}
   */
  getByTopic: function (userId, topicId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return [];

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const results = [];

      for (let i = 1; i < data.length; i++) {
        if (
          data[i][headers.indexOf("topicId")] === topicId &&
          !data[i][headers.indexOf("isCleared")]
        ) {
          const item = {};
          headers.forEach((h, idx) => {
            item[h] = data[i][idx];
          });
          results.push(item);
        }
      }

      return results;
    } catch (error) {
      Logger.log("Error getting topic wrong answers: " + error.toString());
      return [];
    }
  },

  /**
   * Thêm variant đã thử vào danh sách
   * @param {string} userId
   * @param {string} memoryId
   * @param {string} variantId
   */
  addAttemptedVariant: function (userId, memoryId, variantId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return;

      const sheet = spreadsheet.getSheetByName("Wrong_Answer_Memory");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === memoryId) {
          const variantsCol = headers.indexOf("variantsAttempted");
          let variants = [];
          try {
            variants = JSON.parse(data[i][variantsCol] || "[]");
          } catch (e) {
            variants = [];
          }

          if (!variants.includes(variantId)) {
            variants.push(variantId);
            sheet
              .getRange(i + 1, variantsCol + 1)
              .setValue(JSON.stringify(variants));
          }

          break;
        }
      }
    } catch (error) {
      Logger.log("Error adding attempted variant: " + error.toString());
    }
  },
};

// ========== AI LEARNING SESSIONS OPERATIONS ==========

const AILearningSessions = {
  /**
   * Bắt đầu session học
   * @param {string} userId
   * @param {string} topicId
   * @returns {string} sessionId
   */
  start: function (userId, topicId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) throw new Error("User spreadsheet not found");

      ensureAILearningSheetsExist(userId);
      const sheet = spreadsheet.getSheetByName("AI_Learning_Sessions");
      if (!sheet) throw new Error("AI_Learning_Sessions sheet not found");

      const sessionId =
        "ALS_" +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 6);
      const timestamp = new Date();

      const row = [
        sessionId,
        topicId,
        timestamp, // startedAt
        "", // completedAt
        0, // lessonViewed
        0, // mindmapViewed
        0, // infographicViewed
        0, // flashcardsTotal
        0, // flashcardsReviewed
        0, // quizAttempted
        0, // quizScore
        0, // quizAccuracy
        0, // totalTimeSpent
        0, // scrollDepth
        0, // interactionCount
        0, // wrongAnswersCount
        0, // newConceptsLearned
        0, // feedbackScore
        "", // feedbackText
      ];

      sheet.appendRow(row);
      Logger.log("✅ Started learning session: " + sessionId);
      return sessionId;
    } catch (error) {
      Logger.log("Error starting session: " + error.toString());
      throw error;
    }
  },

  /**
   * Update session progress
   * @param {string} userId
   * @param {string} sessionId
   * @param {Object} updateData
   */
  update: function (userId, sessionId, updateData) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return;

      const sheet = spreadsheet.getSheetByName("AI_Learning_Sessions");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === sessionId) {
          Object.keys(updateData).forEach((key) => {
            const colIndex = headers.indexOf(key);
            if (colIndex >= 0) {
              sheet.getRange(i + 1, colIndex + 1).setValue(updateData[key]);
            }
          });
          break;
        }
      }
    } catch (error) {
      Logger.log("Error updating session: " + error.toString());
    }
  },

  /**
   * Hoàn thành session
   * @param {string} userId
   * @param {string} sessionId
   * @param {Object} finalData
   */
  complete: function (userId, sessionId, finalData = {}) {
    try {
      const timestamp = new Date();
      this.update(userId, sessionId, {
        completedAt: timestamp,
        ...finalData,
      });
      Logger.log("✅ Completed learning session: " + sessionId);
    } catch (error) {
      Logger.log("Error completing session: " + error.toString());
    }
  },

  /**
   * Lấy session gần nhất cho topic
   * @param {string} userId
   * @param {string} topicId
   * @returns {Object|null}
   */
  getLastSession: function (userId, topicId) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return null;

      const sheet = spreadsheet.getSheetByName("AI_Learning_Sessions");
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // Tìm từ dưới lên
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][headers.indexOf("topicId")] === topicId) {
          const session = {};
          headers.forEach((h, idx) => {
            session[h] = data[i][idx];
          });
          return session;
        }
      }

      return null;
    } catch (error) {
      Logger.log("Error getting last session: " + error.toString());
      return null;
    }
  },
};

// ========== FLASHCARD PROGRESS OPERATIONS ==========

const FlashcardProgress = {
  /**
   * Lưu hoặc update progress flashcard
   * @param {string} userId
   * @param {Object} cardData
   * @returns {string} cardId
   */
  saveProgress: function (userId, cardData) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) throw new Error("User spreadsheet not found");

      ensureAILearningSheetsExist(userId);
      const sheet = spreadsheet.getSheetByName("Flashcard_Progress");
      if (!sheet) throw new Error("Flashcard_Progress sheet not found");

      // Check existing
      const existing = this.findCard(
        userId,
        cardData.topicId,
        cardData.cardFront
      );
      if (existing) {
        return this.updateProgress(userId, existing.cardId, cardData);
      }

      const cardId =
        "FCP_" +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 6);
      const timestamp = new Date();
      const nextReview = calculateNextReviewDate(0);

      const row = [
        cardId,
        cardData.topicId,
        cardData.cardFront,
        cardData.cardBack,
        cardData.sourceConceptId || "",
        cardData.difficultyRating || "medium",
        1, // timesReviewed
        cardData.isCorrect ? 1 : 0, // timesCorrect
        timestamp, // lastReviewed
        nextReview, // nextReview
        0, // reviewStage = new
        false, // isMemorized
        "", // memorizedAt
      ];

      sheet.appendRow(row);
      return cardId;
    } catch (error) {
      Logger.log("Error saving flashcard progress: " + error.toString());
      throw error;
    }
  },

  /**
   * Tìm flashcard
   * @param {string} userId
   * @param {string} topicId
   * @param {string} cardFront
   * @returns {Object|null}
   */
  findCard: function (userId, topicId, cardFront) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return null;

      const sheet = spreadsheet.getSheetByName("Flashcard_Progress");
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (
          data[i][headers.indexOf("topicId")] === topicId &&
          data[i][headers.indexOf("cardFront")] === cardFront
        ) {
          const card = {};
          headers.forEach((h, idx) => {
            card[h] = data[i][idx];
          });
          card._rowIndex = i + 1;
          return card;
        }
      }

      return null;
    } catch (error) {
      Logger.log("Error finding flashcard: " + error.toString());
      return null;
    }
  },

  /**
   * Update flashcard progress
   * @param {string} userId
   * @param {string} cardId
   * @param {Object} updateData
   * @returns {string} cardId
   */
  updateProgress: function (userId, cardId, updateData) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return null;

      const sheet = spreadsheet.getSheetByName("Flashcard_Progress");
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === cardId) {
          const timesReviewedCol = headers.indexOf("timesReviewed");
          const timesCorrectCol = headers.indexOf("timesCorrect");
          const lastReviewedCol = headers.indexOf("lastReviewed");
          const reviewStageCol = headers.indexOf("reviewStage");
          const nextReviewCol = headers.indexOf("nextReview");
          const difficultyCol = headers.indexOf("difficultyRating");
          const isMemorizedCol = headers.indexOf("isMemorized");
          const memorizedAtCol = headers.indexOf("memorizedAt");

          const timestamp = new Date();
          const newTimesReviewed = (data[i][timesReviewedCol] || 0) + 1;
          const newTimesCorrect =
            (data[i][timesCorrectCol] || 0) + (updateData.isCorrect ? 1 : 0);

          sheet
            .getRange(i + 1, timesReviewedCol + 1)
            .setValue(newTimesReviewed);
          sheet.getRange(i + 1, timesCorrectCol + 1).setValue(newTimesCorrect);
          sheet.getRange(i + 1, lastReviewedCol + 1).setValue(timestamp);

          if (updateData.difficultyRating) {
            sheet
              .getRange(i + 1, difficultyCol + 1)
              .setValue(updateData.difficultyRating);
          }

          // Update review stage based on difficulty rating
          let newStage = data[i][reviewStageCol] || 0;
          if (updateData.difficultyRating === "easy") {
            newStage = Math.min(newStage + 1, 3); // Advance faster
          } else if (updateData.difficultyRating === "hard") {
            newStage = Math.max(newStage - 1, 0); // Go back
          }

          sheet.getRange(i + 1, reviewStageCol + 1).setValue(newStage);
          sheet
            .getRange(i + 1, nextReviewCol + 1)
            .setValue(calculateNextReviewDate(newStage));

          // Check if memorized (stage 3 + high correct rate)
          if (newStage >= 3 && newTimesCorrect / newTimesReviewed >= 0.8) {
            sheet.getRange(i + 1, isMemorizedCol + 1).setValue(true);
            sheet.getRange(i + 1, memorizedAtCol + 1).setValue(timestamp);
          }

          return cardId;
        }
      }

      return null;
    } catch (error) {
      Logger.log("Error updating flashcard progress: " + error.toString());
      return null;
    }
  },

  /**
   * Lấy flashcards cần ôn
   * @param {string} userId
   * @param {string} topicId
   * @returns {Array}
   */
  getDueForReview: function (userId, topicId = null) {
    try {
      const spreadsheet = getUserSpreadsheet(userId);
      if (!spreadsheet) return [];

      const sheet = spreadsheet.getSheetByName("Flashcard_Progress");
      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const now = new Date();
      const results = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const isMemorized = row[headers.indexOf("isMemorized")];
        const nextReview = new Date(row[headers.indexOf("nextReview")]);
        const rowTopicId = row[headers.indexOf("topicId")];

        if (!isMemorized && nextReview <= now) {
          if (!topicId || rowTopicId === topicId) {
            const card = {};
            headers.forEach((h, idx) => {
              card[h] = row[idx];
            });
            results.push(card);
          }
        }
      }

      return results;
    } catch (error) {
      Logger.log("Error getting due flashcards: " + error.toString());
      return [];
    }
  },
};
