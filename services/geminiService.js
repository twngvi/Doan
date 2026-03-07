/**
 * geminiService.js - Gemini AI Integration Service
 *
 * Phase 1: Basic Setup & API Connection
 *
 * Chức năng:
 * - Kết nối với Gemini API
 * - Quản lý API key
 * - Các hàm gọi API cơ bản
 * - Rate limiting & Error handling
 */

// ========== GEMINI SERVICE ==========

const GeminiService = {
  // API Endpoint - gemini-pro hoạt động trên v1
  API_ENDPOINT: "https://generativelanguage.googleapis.com/v1/",

  /**
   * Lấy API Key từ Script Properties
   * @returns {string|null} API Key hoặc null nếu chưa setup
   */
  getApiKey: function () {
    try {
      const key = PropertiesService.getScriptProperties().getProperty(
        AI_CONFIG.GEMINI_API_KEY_PROPERTY,
      );
      if (!key) {
        Logger.log("⚠️ GEMINI_API_KEY chưa được setup trong Script Properties");
        return null;
      }
      return key;
    } catch (error) {
      Logger.log("Error getting API key: " + error.toString());
      return null;
    }
  },

  /**
   * Setup API Key (chạy 1 lần bởi Admin)
   * @param {string} apiKey - Gemini API Key
   * @returns {boolean} Success status
   */
  setupApiKey: function (apiKey) {
    try {
      if (!apiKey || apiKey.length < 10) {
        throw new Error("Invalid API key format");
      }
      PropertiesService.getScriptProperties().setProperty(
        AI_CONFIG.GEMINI_API_KEY_PROPERTY,
        apiKey,
      );
      Logger.log("✅ Gemini API Key đã được lưu thành công!");
      return true;
    } catch (error) {
      Logger.log("Error setting API key: " + error.toString());
      return false;
    }
  },

  /**
   * Kiểm tra API Key có hoạt động không
   * @returns {Object} Status và thông tin
   */
  testConnection: function () {
    try {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          message:
            "API Key chưa được setup. Vui lòng chạy: ADMIN_setupGeminiApiKey()",
        };
      }

      // Test với request đơn giản
      const testPrompt = "Respond with exactly: CONNECTION_OK";
      const response = this._callAPI(testPrompt, { maxTokens: 50 });

      if (response && response.includes("CONNECTION_OK")) {
        return {
          success: true,
          message: "✅ Gemini API kết nối thành công!",
          model: AI_CONFIG.GEMINI_MODEL_DEFAULT,
        };
      } else {
        return {
          success: true,
          message: "✅ API kết nối được nhưng response không như mong đợi",
          response: response,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "❌ Lỗi kết nối: " + error.toString(),
      };
    }
  },

  /**
   * Gọi Gemini API với xử lý lỗi 429 (quota)
   * @param {string} prompt - Prompt gửi cho AI
   * @param {Object} config - Cấu hình (temperature, maxTokens, model)
   * @returns {string|Object} Response từ AI
   */
  _callAPI: function (prompt, config = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API Key chưa được setup");
    }

    const model = config.model || AI_CONFIG.GEMINI_MODEL_DEFAULT;
    // Đảm bảo model có format "models/tên-model"
    const modelPath = model.startsWith("models/") ? model : "models/" + model;
    const url =
      this.API_ENDPOINT + modelPath + ":generateContent?key=" + apiKey;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || AI_CONFIG.MAX_TOKENS_PER_REQUEST,
        topP: 0.9,
        topK: 40,
      },
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true, // Quan trọng để xử lý lỗi 429
    };

    const startTime = Date.now();
    let response = UrlFetchApp.fetch(url, options);
    let responseCode = response.getResponseCode();

    // Xử lý lỗi 429 (Quota exceeded) - đợi và thử lại (tối đa 2 lần, giảm thời gian chờ)
    if (responseCode === 429) {
      Logger.log("⚠️ Quota exceeded (429). Đang đợi 15 giây...");
      Utilities.sleep(15000);
      response = UrlFetchApp.fetch(url, options);
      responseCode = response.getResponseCode();

      if (responseCode === 429) {
        Logger.log("⚠️ Vẫn bị quota. Đang đợi thêm 20 giây...");
        Utilities.sleep(20000);
        response = UrlFetchApp.fetch(url, options);
        responseCode = response.getResponseCode();
      }
    }

    const processingTime = Date.now() - startTime;
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      let errorMsg = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorMsg = errorJson.error?.message || responseText;
      } catch (e) {}
      throw new Error("Gemini API Error (" + responseCode + "): " + errorMsg);
    }

    const json = JSON.parse(responseText);

    if (json.error) {
      throw new Error("Gemini API Error: " + json.error.message);
    }

    // Extract text từ response
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    // Log usage
    Logger.log("✅ Gemini API call successful. Time: " + processingTime + "ms");

    // Try parse as JSON if expected
    if (config.expectJson) {
      try {
        // Tìm JSON trong response (có thể có text trước/sau)
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        Logger.log("Could not parse as JSON, returning raw text");
      }
    }

    return text;
  },

  /**
   * Gọi API với retry logic (xử lý quota 429)
   * @param {string} prompt
   * @param {Object} config
   * @param {number} maxRetries
   * @returns {string|Object}
   */
  callWithRetry: function (prompt, config = {}, maxRetries = 2) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return this._callAPI(prompt, config);
      } catch (error) {
        lastError = error;
        const errorStr = error.toString();
        Logger.log("🔄 Retry " + (i + 1) + "/" + maxRetries + ": " + errorStr);

        // Nếu là rate limit (429), đợi ngắn hơn vì _callAPI đã retry nội bộ
        if (
          errorStr.includes("429") ||
          errorStr.includes("quota") ||
          errorStr.includes("RESOURCE_EXHAUSTED")
        ) {
          const waitTime = 10000 * (i + 1); // 10s, 20s
          Logger.log(
            "⏳ Rate limit detected. Waiting " + waitTime / 1000 + "s...",
          );
          Utilities.sleep(waitTime);
        } else {
          Utilities.sleep(2000 * (i + 1)); // 2s, 4s cho lỗi khác
        }
      }
    }

    throw lastError;
  },

  /**
   * Đọc nội dung từ Google Doc
   * @param {string} docId - Google Doc ID
   * @returns {Object} { content, lastModified, wordCount }
   */
  readGoogleDoc: function (docId) {
    try {
      const doc = DocumentApp.openById(docId);
      const body = doc.getBody();
      const content = body.getText();
      const lastModified = DriveApp.getFileById(docId).getLastUpdated();

      return {
        success: true,
        content: content,
        lastModified: lastModified,
        wordCount: content.split(/\s+/).length,
        title: doc.getName(),
      };
    } catch (error) {
      Logger.log("Error reading Google Doc: " + error.toString());
      return {
        success: false,
        error: error.toString(),
      };
    }
  },

  /**
   * Log AI Generation vào MASTER_DB
   * @param {Object} logData
   * @returns {string} logId
   */
  logGeneration: function (logData) {
    try {
      const sheet = getSheet("AI_Generation_Logs");
      if (!sheet) {
        Logger.log("AI_Generation_Logs sheet not found");
        return null;
      }

      const logId = generateId("AGL");
      const timestamp = new Date();

      const row = [
        logId,
        logData.userId || "SYSTEM",
        logData.topicId || "",
        logData.requestType || "unknown",
        logData.inputDocId || "",
        logData.inputDocLength || 0,
        logData.outputItemsCount || 0,
        logData.status || "pending",
        logData.errorMessage || "",
        logData.tokensConsumed || 0,
        logData.costEstimate || 0,
        logData.processingTime || 0,
        logData.geminiModel || AI_CONFIG.GEMINI_MODEL_DEFAULT,
        logData.promptVersion || "v1",
        timestamp,
      ];

      sheet.appendRow(row);
      return logId;
    } catch (error) {
      Logger.log("Error logging generation: " + error.toString());
      return null;
    }
  },

  /**
   * Update log status
   * @param {string} logId
   * @param {Object} updateData
   */
  updateLogStatus: function (logId, updateData) {
    try {
      const sheet = getSheet("AI_Generation_Logs");
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === logId) {
          // Update các cột cần thiết
          if (updateData.status) {
            const statusCol = headers.indexOf("status");
            if (statusCol >= 0)
              sheet.getRange(i + 1, statusCol + 1).setValue(updateData.status);
          }
          if (updateData.errorMessage) {
            const errorCol = headers.indexOf("errorMessage");
            if (errorCol >= 0)
              sheet
                .getRange(i + 1, errorCol + 1)
                .setValue(updateData.errorMessage);
          }
          if (updateData.outputItemsCount) {
            const countCol = headers.indexOf("outputItemsCount");
            if (countCol >= 0)
              sheet
                .getRange(i + 1, countCol + 1)
                .setValue(updateData.outputItemsCount);
          }
          if (updateData.processingTime) {
            const timeCol = headers.indexOf("processingTime");
            if (timeCol >= 0)
              sheet
                .getRange(i + 1, timeCol + 1)
                .setValue(updateData.processingTime);
          }
          break;
        }
      }
    } catch (error) {
      Logger.log("Error updating log: " + error.toString());
    }
  },
};

// ========== ADMIN FUNCTIONS ==========

/**
 * [ADMIN] Setup Gemini API Key
 * Chạy hàm này trong Script Editor với API key của bạn
 */
function ADMIN_setupGeminiApiKey() {
  // ⚠️ API Key mới (đã thay thế)
  const YOUR_API_KEY = "AIzaSyDmIrja-q3C8p1Eus4nQ_B0e0J0g9iw3LA";

  const result = GeminiService.setupApiKey(YOUR_API_KEY);
  if (result) {
    Logger.log("✅ API Key đã được lưu!");
    Logger.log("🔄 Đang test kết nối...");
    const testResult = GeminiService.testConnection();
    Logger.log(JSON.stringify(testResult, null, 2));
  }
}

/**
 * [ADMIN] Test Gemini API Connection
 */
function ADMIN_testGeminiConnection() {
  const result = GeminiService.testConnection();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * [ADMIN] Test đọc Google Doc
 */
function ADMIN_testReadGoogleDoc() {
  // Thay bằng Doc ID thật để test
  const TEST_DOC_ID = "YOUR_GOOGLE_DOC_ID";

  const result = GeminiService.readGoogleDoc(TEST_DOC_ID);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * [ADMIN] Update contentDocId cho một topic trong MASTER_DB
 * Chạy hàm này để thêm Google Doc ID cho topic
 */
function ADMIN_updateTopicContentDocId() {
  const MASTER_DB_ID = "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
  const TOPIC_ID = "TOP001";
  const CONTENT_DOC_ID = "19UAHFVkxt0K_MrjqlZw0cUGYuULbJG7ak1xYnS0ogMw";

  try {
    const ss = SpreadsheetApp.openById(MASTER_DB_ID);
    const sheet = ss.getSheetByName("Topics");

    if (!sheet) {
      Logger.log("❌ Topics sheet not found");
      return { success: false, message: "Topics sheet not found" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find topicId column (column A = index 0)
    let topicIdCol = 0;
    // contentDocId should be column N (index 13)
    let contentDocIdCol = 13;

    // Find the header for contentDocId
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] === "contentDocId") {
        contentDocIdCol = i;
        break;
      }
    }

    Logger.log("contentDocId column index: " + contentDocIdCol);

    // Find the topic row and update
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === TOPIC_ID) {
        // Column N = column 14 (1-indexed)
        sheet.getRange(i + 1, contentDocIdCol + 1).setValue(CONTENT_DOC_ID);
        Logger.log(
          "✅ Updated " + TOPIC_ID + " with contentDocId: " + CONTENT_DOC_ID,
        );

        // Clear server cache
        topicsCacheServer = null;

        return {
          success: true,
          message: "Updated contentDocId for " + TOPIC_ID,
          docId: CONTENT_DOC_ID,
        };
      }
    }

    Logger.log("❌ Topic not found: " + TOPIC_ID);
    return { success: false, message: "Topic not found: " + TOPIC_ID };
  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
