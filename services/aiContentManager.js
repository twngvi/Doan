/**
 * aiContentManager.js - AI Content Cache Management
 *
 * Phase 1: Database Operations for AI Content
 *
 * Chức năng:
 * - CRUD operations cho AI_Content_Cache
 * - CRUD operations cho AI_Question_Pool
 * - Cache validation & cleanup
 */

// ========== AI CONTENT CACHE OPERATIONS ==========

const AIContentCache = {
  /**
   * Lưu nội dung AI vào cache
   * @param {Object} cacheData
   * @returns {string} cacheId
   */
  save: function (cacheData) {
    try {
      const sheet = getSheet("AI_Content_Cache");
      if (!sheet) {
        throw new Error(
          "AI_Content_Cache sheet not found. Please run createAllSheets()"
        );
      }

      const cacheId = generateId("AIC");
      const timestamp = new Date();
      const expiresAt = generateCacheExpiryDate();

      const row = [
        cacheId,
        cacheData.topicId,
        cacheData.contentDocId,
        cacheData.contentType,
        typeof cacheData.generatedContent === "object"
          ? JSON.stringify(cacheData.generatedContent)
          : cacheData.generatedContent,
        cacheData.promptUsed || "",
        cacheData.geminiModel || AI_CONFIG.GEMINI_MODEL_DEFAULT,
        cacheData.tokensUsed || 0,
        cacheData.generationTime || 0,
        cacheData.qualityScore || 0,
        cacheData.version || "v1",
        cacheData.docLastModified || timestamp,
        true, // isActive
        timestamp, // createdAt
        expiresAt,
      ];

      sheet.appendRow(row);
      Logger.log(
        "✅ AI Content cached: " + cacheId + " [" + cacheData.contentType + "]"
      );
      return cacheId;
    } catch (error) {
      Logger.log("Error saving AI content cache: " + error.toString());
      throw error;
    }
  },

  /**
   * Lấy content từ cache
   * @param {string} topicId
   * @param {string} contentType - mindmap|infographic|flashcards|lesson_summary|questions
   * @returns {Object|null} Cached content hoặc null
   */
  get: function (topicId, contentType) {
    try {
      const sheet = getSheet("AI_Content_Cache");
      if (!sheet) {
        Logger.log("⚠️ AI_Content_Cache sheet not found");
        return null;
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      Logger.log("📊 Cache headers: " + JSON.stringify(headers));
      Logger.log(
        "📊 Looking for topicId=" + topicId + ", contentType=" + contentType
      );

      // Get column indices
      const topicIdCol = headers.indexOf("topicId");
      const contentTypeCol = headers.indexOf("contentType");
      const generatedContentCol = headers.indexOf("generatedContent");
      const isActiveCol = headers.indexOf("isActive");
      const expiresAtCol = headers.indexOf("expiresAt");

      if (
        topicIdCol === -1 ||
        contentTypeCol === -1 ||
        generatedContentCol === -1
      ) {
        Logger.log("⚠️ Required columns not found in cache sheet");
        return null;
      }

      // Tìm từ dưới lên (mới nhất)
      for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const rowTopicId = String(row[topicIdCol]).trim();
        const rowContentType = String(row[contentTypeCol]).trim();

        // isActive - default to true if column doesn't exist
        const isActive = isActiveCol === -1 ? true : row[isActiveCol];

        // Check for match
        if (rowTopicId === topicId && rowContentType === contentType) {
          Logger.log("✅ Found cache match at row " + (i + 1));

          // Skip if explicitly inactive
          if (
            isActive === false ||
            isActive === "false" ||
            isActive === "FALSE"
          ) {
            Logger.log("⚠️ Cache entry is inactive, skipping");
            continue;
          }

          // Check expiry only if column exists
          if (expiresAtCol !== -1 && row[expiresAtCol]) {
            if (isCacheExpired(row[expiresAtCol])) {
              Logger.log(
                "⚠️ Cache expired for: " + topicId + " [" + contentType + "]"
              );
              continue; // Try to find older valid cache
            }
          }

          // Parse content
          const contentStr = row[generatedContentCol];
          let content;

          // Always clean markdown wrapper first
          let cleanStr = contentStr;
          if (typeof cleanStr === "string") {
            // Remove ```json at start and ``` at end (with any whitespace/newlines)
            cleanStr = cleanStr
              .replace(/^```json[\s\n]*/, "")
              .replace(/[\s\n]*```$/, "")
              .trim();
            Logger.log(
              "🧹 Cleaned content preview: " + cleanStr.substring(0, 100)
            );
          }

          // Try to parse as JSON
          try {
            content = JSON.parse(cleanStr);
            Logger.log("✅ Successfully parsed JSON content");
          } catch (e) {
            Logger.log("⚠️ JSON parse error: " + e.toString());
            Logger.log("⚠️ Content may be truncated or invalid JSON");

            // Try to use cleaned string (without markdown)
            content = cleanStr;

            // Last resort: try to fix common JSON issues
            if (typeof cleanStr === "string") {
              try {
                // Try to complete the JSON if it's truncated
                let fixedStr = cleanStr.trim();
                // Count braces to see if incomplete
                const openBraces = (fixedStr.match(/{/g) || []).length;
                const closeBraces = (fixedStr.match(/}/g) || []).length;

                if (openBraces > closeBraces) {
                  Logger.log("⚠️ Detected truncated JSON - attempting fix");
                  // Add missing closing braces
                  for (let i = 0; i < openBraces - closeBraces; i++) {
                    fixedStr += "}";
                  }
                  content = JSON.parse(fixedStr);
                  Logger.log("✅ Successfully repaired and parsed JSON");
                }
              } catch (fixError) {
                Logger.log("⚠️ Could not repair JSON: " + fixError.toString());
                // Keep the cleaned string
              }
            }
          }

          return {
            cacheId: row[headers.indexOf("cacheId")] || "UNKNOWN",
            topicId: rowTopicId,
            contentType: rowContentType,
            content: content,
            docLastModified: row[headers.indexOf("docLastModified")] || null,
            version: row[headers.indexOf("version")] || "v1",
            createdAt: row[headers.indexOf("createdAt")] || null,
            expiresAt: expiresAtCol !== -1 ? row[expiresAtCol] : null,
          };
        }
      }

      Logger.log(
        "❌ No cache found for: " + topicId + " [" + contentType + "]"
      );
      return null;
    } catch (error) {
      Logger.log("❌ Error getting AI content cache: " + error.toString());
      return null;
    }
  },

  /**
   * Lấy tất cả content types cho một topic
   * @param {string} topicId
   * @returns {Object} { mindmap, infographic, flashcards, etc. }
   */
  getAllForTopic: function (topicId) {
    const result = {};

    AI_CONFIG.CONTENT_TYPES.forEach((type) => {
      const cached = this.get(topicId, type);
      if (cached) {
        result[type] = cached;
      }
    });

    return result;
  },

  /**
   * Kiểm tra cache có valid không (chưa hết hạn VÀ doc chưa thay đổi)
   * @param {string} topicId
   * @param {string} contentType
   * @param {Date} currentDocLastModified
   * @returns {boolean}
   */
  isValid: function (topicId, contentType, currentDocLastModified) {
    const cached = this.get(topicId, contentType);
    if (!cached) return false;

    // Check nếu doc đã thay đổi
    if (
      currentDocLastModified &&
      shouldRegenerateContent(currentDocLastModified, cached.docLastModified)
    ) {
      Logger.log(
        "Cache invalid - doc modified for: " +
          topicId +
          " [" +
          contentType +
          "]"
      );
      return false;
    }

    return true;
  },

  /**
   * Invalidate cache (đánh dấu isActive = false)
   * @param {string} topicId
   * @param {string} contentType - nếu null thì invalidate tất cả
   */
  invalidate: function (topicId, contentType = null) {
    try {
      const sheet = getSheet("AI_Content_Cache");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const topicCol = headers.indexOf("topicId");
      const typeCol = headers.indexOf("contentType");
      const activeCol = headers.indexOf("isActive");

      for (let i = 1; i < data.length; i++) {
        if (data[i][topicCol] === topicId) {
          if (!contentType || data[i][typeCol] === contentType) {
            sheet.getRange(i + 1, activeCol + 1).setValue(false);
          }
        }
      }

      Logger.log(
        "Cache invalidated for: " +
          topicId +
          (contentType ? " [" + contentType + "]" : " [ALL]")
      );
    } catch (error) {
      Logger.log("Error invalidating cache: " + error.toString());
    }
  },

  /**
   * Cleanup expired cache entries
   * Nên chạy định kỳ (trigger hàng ngày)
   */
  cleanup: function () {
    try {
      const sheet = getSheet("AI_Content_Cache");
      if (!sheet) return { deleted: 0 };

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const expiresCol = headers.indexOf("expiresAt");
      const activeCol = headers.indexOf("isActive");

      let deletedCount = 0;
      const now = new Date();

      // Đánh dấu inactive thay vì xóa
      for (let i = data.length - 1; i >= 1; i--) {
        const expiresAt = data[i][expiresCol];
        if (expiresAt && new Date(expiresAt) < now && data[i][activeCol]) {
          sheet.getRange(i + 1, activeCol + 1).setValue(false);
          deletedCount++;
        }
      }

      Logger.log("Cache cleanup: " + deletedCount + " entries marked inactive");
      return { deleted: deletedCount };
    } catch (error) {
      Logger.log("Error cleaning up cache: " + error.toString());
      return { error: error.toString() };
    }
  },
};

// ========== AI QUESTION POOL OPERATIONS ==========

const AIQuestionPool = {
  /**
   * Thêm câu hỏi vào pool
   * @param {Object} questionData
   * @returns {string} questionId
   */
  addQuestion: function (questionData) {
    try {
      const sheet = getSheet("AI_Question_Pool");
      if (!sheet) {
        throw new Error("AI_Question_Pool sheet not found");
      }

      const questionId = generateId("AIQ");
      const timestamp = new Date();

      const row = [
        questionId,
        questionData.topicId,
        questionData.baseConceptId || "",
        questionData.questionText,
        questionData.optionA,
        questionData.optionB,
        questionData.optionC,
        questionData.optionD,
        questionData.correctAnswer,
        questionData.explanation || "",
        questionData.difficulty || "medium",
        questionData.bloomLevel || "understand",
        questionData.variantType || "original",
        questionData.parentQuestionId || "",
        questionData.variantNumber || 0,
        0, // timesUsed
        0, // avgCorrectRate
        questionData.createdBy || "AI",
        true, // isActive
        timestamp,
      ];

      sheet.appendRow(row);
      Logger.log("✅ Question added to pool: " + questionId);
      return questionId;
    } catch (error) {
      Logger.log("Error adding question: " + error.toString());
      throw error;
    }
  },

  /**
   * Thêm nhiều câu hỏi cùng lúc
   * @param {Array} questions
   * @returns {Array} questionIds
   */
  addQuestions: function (questions) {
    const ids = [];
    questions.forEach((q) => {
      try {
        const id = this.addQuestion(q);
        ids.push(id);
      } catch (e) {
        Logger.log("Error adding question: " + e.toString());
      }
    });
    return ids;
  },

  /**
   * Lấy câu hỏi theo ID
   * @param {string} questionId
   * @returns {Object|null}
   */
  getById: function (questionId) {
    try {
      const sheet = getSheet("AI_Question_Pool");
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === questionId) {
          const question = {};
          headers.forEach((h, idx) => {
            question[h] = data[i][idx];
          });
          return question;
        }
      }

      return null;
    } catch (error) {
      Logger.log("Error getting question: " + error.toString());
      return null;
    }
  },

  /**
   * Lấy tất cả câu hỏi gốc (original) cho một topic
   * @param {string} topicId
   * @returns {Array}
   */
  getOriginalsByTopic: function (topicId) {
    try {
      const sheet = getSheet("AI_Question_Pool");
      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const questions = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (
          row[headers.indexOf("topicId")] === topicId &&
          row[headers.indexOf("variantType")] === "original" &&
          row[headers.indexOf("isActive")]
        ) {
          const question = {};
          headers.forEach((h, idx) => {
            question[h] = row[idx];
          });
          questions.push(question);
        }
      }

      return questions;
    } catch (error) {
      Logger.log("Error getting questions: " + error.toString());
      return [];
    }
  },

  /**
   * Lấy variants của một câu hỏi
   * @param {string} parentQuestionId
   * @returns {Array}
   */
  getVariants: function (parentQuestionId) {
    try {
      const sheet = getSheet("AI_Question_Pool");
      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const variants = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (
          row[headers.indexOf("parentQuestionId")] === parentQuestionId &&
          row[headers.indexOf("isActive")]
        ) {
          const variant = {};
          headers.forEach((h, idx) => {
            variant[h] = row[idx];
          });
          variants.push(variant);
        }
      }

      return variants;
    } catch (error) {
      Logger.log("Error getting variants: " + error.toString());
      return [];
    }
  },

  /**
   * Đếm số variants hiện có
   * @param {string} parentQuestionId
   * @returns {number}
   */
  countVariants: function (parentQuestionId) {
    return this.getVariants(parentQuestionId).length;
  },

  /**
   * Kiểm tra có thể tạo thêm variant không
   * @param {string} parentQuestionId
   * @returns {boolean}
   */
  canAddVariant: function (parentQuestionId) {
    const count = this.countVariants(parentQuestionId);
    return count < AI_CONFIG.MAX_VARIANTS_PER_QUESTION;
  },

  /**
   * Update thống kê câu hỏi (sau khi user trả lời)
   * @param {string} questionId
   * @param {boolean} isCorrect
   */
  updateStats: function (questionId, isCorrect) {
    try {
      const sheet = getSheet("AI_Question_Pool");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === questionId) {
          const timesUsedCol = headers.indexOf("timesUsed");
          const avgCorrectCol = headers.indexOf("avgCorrectRate");

          const oldTimesUsed = data[i][timesUsedCol] || 0;
          const oldAvgCorrect = data[i][avgCorrectCol] || 0;

          const newTimesUsed = oldTimesUsed + 1;
          const newAvgCorrect =
            (oldAvgCorrect * oldTimesUsed + (isCorrect ? 100 : 0)) /
            newTimesUsed;

          sheet.getRange(i + 1, timesUsedCol + 1).setValue(newTimesUsed);
          sheet
            .getRange(i + 1, avgCorrectCol + 1)
            .setValue(Math.round(newAvgCorrect));

          break;
        }
      }
    } catch (error) {
      Logger.log("Error updating question stats: " + error.toString());
    }
  },

  /**
   * Deactivate câu hỏi
   * @param {string} questionId
   */
  deactivate: function (questionId) {
    try {
      const sheet = getSheet("AI_Question_Pool");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const activeCol = headers.indexOf("isActive");

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === questionId) {
          sheet.getRange(i + 1, activeCol + 1).setValue(false);
          break;
        }
      }
    } catch (error) {
      Logger.log("Error deactivating question: " + error.toString());
    }
  },
};

// ========== HELPER: Generate ID ==========

// Nếu chưa có hàm generateId, thêm ở đây
function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return prefix + "_" + timestamp + random;
}

// ========== ADMIN TEST FUNCTIONS ==========

/**
 * [ADMIN] Test cache retrieval
 */
function ADMIN_testCacheGet() {
  const topicId = "TOP001";
  const contentType = "mindmap";

  Logger.log("=== TESTING CACHE GET ===");
  Logger.log("Looking for: " + topicId + " / " + contentType);

  const result = AIContentCache.get(topicId, contentType);

  if (result) {
    Logger.log("✅ Cache found!");
    Logger.log("Content type: " + typeof result.content);
    Logger.log("Content: " + JSON.stringify(result.content).substring(0, 200));
  } else {
    Logger.log("❌ Cache NOT found");

    // Debug: show what's in the sheet
    const sheet = getSheet("AI_Content_Cache");
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      Logger.log("📊 Sheet headers: " + JSON.stringify(data[0]));
      Logger.log("📊 Total rows: " + (data.length - 1));

      // Show first few data rows
      for (let i = 1; i < Math.min(4, data.length); i++) {
        Logger.log("Row " + i + ": " + JSON.stringify(data[i].slice(0, 5)));
      }
    }
  }

  return result;
}

// ========== ADMIN FUNCTIONS ==========

/**
 * [ADMIN] Tạo lại tất cả sheets (bao gồm AI sheets mới)
 */
function ADMIN_recreateAllSheets() {
  try {
    createAllSheets();
    Logger.log("✅ All sheets recreated including AI tables!");
  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
  }
}

/**
 * [ADMIN] Cleanup expired AI content cache
 */
function ADMIN_cleanupExpiredCache() {
  const result = AIContentCache.cleanup();
  Logger.log("Cleanup result: " + JSON.stringify(result));
  return result;
}

/**
 * [ADMIN] Test AI Content Cache
 */
function ADMIN_testAIContentCache() {
  // Test save
  const testCacheId = AIContentCache.save({
    topicId: "TOP001",
    contentDocId: "test_doc_id",
    contentType: "mindmap",
    generatedContent: { root: "Test", branches: [] },
    geminiModel: "gemini-2.5-flash-lite",
    tokensUsed: 100,
    generationTime: 500,
    version: "v1",
  });

  Logger.log("Saved cache: " + testCacheId);

  // Test get
  const cached = AIContentCache.get("TOP001", "mindmap");
  Logger.log("Retrieved cache: " + JSON.stringify(cached));

  return { testCacheId, cached };
}

/**
 * [TEST] Test getAIContent function directly
 */
function TEST_getAIContentDirect() {
  Logger.log("=== TESTING getAIContent ===");
  const result = getAIContent("TOP001", "mindmap", false);
  Logger.log("=== RESULT ===");
  Logger.log("Type: " + typeof result);
  Logger.log("Success: " + result?.success);
  Logger.log("Data type: " + typeof result?.data);
  if (result && result.data) {
    Logger.log(
      "Data preview: " + JSON.stringify(result.data).substring(0, 200)
    );
  }
  return result;
}
