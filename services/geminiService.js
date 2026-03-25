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

  USER_KEY_PREFIX: AI_CONFIG.GEMINI_USER_KEY_PREFIX || "GEMINI_USER_KEY_",
  KEY_SECRET_PROPERTY:
    AI_CONFIG.GEMINI_KEY_ENCRYPTION_SECRET_PROPERTY ||
    "GEMINI_KEY_ENCRYPTION_SECRET",

  _lastSetupApiKeyError: "",

  _normalizeApiKey: function (apiKey) {
    var key = String(apiKey || "").trim();

    // Remove accidental wrapping quotes when users copy/paste from docs/chat.
    key = key.replace(/^[`"'“”‘’]+|[`"'“”‘’]+$/g, "");

    // Remove hidden unicode and any whitespace/newlines introduced by copy/paste.
    key = key.replace(/[\u200B-\u200D\uFEFF]/g, "");
    key = key.replace(/\s+/g, "");

    return key;
  },

  _maskApiKey: function (apiKey) {
    const key = this._normalizeApiKey(apiKey);
    if (!key) return "";
    if (key.length <= 10) return "***";
    return key.substring(0, 6) + "..." + key.substring(key.length - 4);
  },

  _isValidApiKeyFormat: function (apiKey) {
    const key = this._normalizeApiKey(apiKey);
    return /^AIza[\w-]{30,}$/.test(key);
  },

  _getEncryptionSecret: function () {
    const props = PropertiesService.getScriptProperties();
    let secret = props.getProperty(this.KEY_SECRET_PROPERTY);

    if (!secret) {
      secret =
        Utilities.getUuid().replace(/-/g, "") +
        Utilities.getUuid().replace(/-/g, "");
      props.setProperty(this.KEY_SECRET_PROPERTY, secret);
    }

    return secret;
  },

  _xorCipher: function (text, secret) {
    const textChars = String(text || "").split("");
    const secretChars = String(secret || "").split("");
    const output = [];

    for (let i = 0; i < textChars.length; i++) {
      const textCode = textChars[i].charCodeAt(0);
      const secretCode = secretChars[i % secretChars.length].charCodeAt(0);
      output.push(String.fromCharCode(textCode ^ secretCode));
    }

    return output.join("");
  },

  _encryptApiKey: function (plainKey) {
    const key = this._normalizeApiKey(plainKey);
    const secret = this._getEncryptionSecret();
    const cipherText = this._xorCipher(key, secret);
    return Utilities.base64EncodeWebSafe(cipherText, Utilities.Charset.UTF_8);
  },

  _decryptApiKey: function (encryptedKey) {
    try {
      const decoded = Utilities.newBlob(
        Utilities.base64DecodeWebSafe(String(encryptedKey || "")),
      ).getDataAsString("UTF-8");
      const secret = this._getEncryptionSecret();
      return this._xorCipher(decoded, secret);
    } catch (error) {
      Logger.log("Error decrypting API key: " + error.toString());
      return "";
    }
  },

  _hashApiKey: function (apiKey) {
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      this._normalizeApiKey(apiKey),
      Utilities.Charset.UTF_8,
    );
    return digest
      .map(function (byte) {
        const value = byte < 0 ? byte + 256 : byte;
        return ("0" + value.toString(16)).slice(-2);
      })
      .join("");
  },

  _getUsersSheet: function () {
    const ss = getOrCreateDatabase();
    return ss ? ss.getSheetByName("Users") : null;
  },

  _ensureKeySheets: function () {
    const ss = getOrCreateDatabase();
    if (!ss) return;

    const keySheetConfig = DB_CONFIG?.SHEETS?.AI_USER_KEYS;
    const usageSheetConfig = DB_CONFIG?.SHEETS?.AI_KEY_USAGE_LOGS;

    if (keySheetConfig && !ss.getSheetByName(keySheetConfig.name)) {
      createSheet(ss, keySheetConfig);
    }
    if (usageSheetConfig && !ss.getSheetByName(usageSheetConfig.name)) {
      createSheet(ss, usageSheetConfig);
    }
  },

  _findUserById: function (userId) {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) return null;

    const usersSheet = this._getUsersSheet();
    if (!usersSheet) return null;

    const data = usersSheet.getDataRange().getValues();
    if (!data || data.length < 2) return null;

    const headers = data[0];
    const userIdCol = headers.indexOf("userId");
    const emailCol = headers.indexOf("email");
    const isActiveCol = headers.indexOf("isActive");

    if (userIdCol < 0) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][userIdCol] || "").trim() !== normalizedUserId) {
        continue;
      }

      return {
        userId: normalizedUserId,
        email: String(data[i][emailCol] || "").trim(),
        isActive:
          isActiveCol < 0
            ? true
            : !(data[i][isActiveCol] === false || data[i][isActiveCol] === "FALSE"),
      };
    }

    return null;
  },

  _findUserByEmail: function (email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return null;

    const usersSheet = this._getUsersSheet();
    if (!usersSheet) return null;

    const data = usersSheet.getDataRange().getValues();
    if (!data || data.length < 2) return null;

    const headers = data[0];
    const userIdCol = headers.indexOf("userId");
    const emailCol = headers.indexOf("email");
    const isActiveCol = headers.indexOf("isActive");

    if (userIdCol < 0 || emailCol < 0) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol] || "").trim().toLowerCase() !== normalizedEmail) {
        continue;
      }

      return {
        userId: String(data[i][userIdCol] || "").trim(),
        email: String(data[i][emailCol] || "").trim(),
        isActive:
          isActiveCol < 0
            ? true
            : !(data[i][isActiveCol] === false || data[i][isActiveCol] === "FALSE"),
      };
    }

    return null;
  },

  resolveAuthenticatedUser: function (userContext) {
    const sessionEmail = String(Session.getActiveUser().getEmail() || "").trim();
    let sessionUser = null;

    if (sessionEmail && sessionEmail !== "anonymous") {
      sessionUser = this._findUserByEmail(sessionEmail);
      if (sessionUser && !sessionUser.isActive) {
        throw new Error("Tài khoản đang bị vô hiệu hóa");
      }
    }

    if (sessionUser) {
      if (userContext && userContext.userId) {
        const requestedUserId = String(userContext.userId || "").trim();
        if (requestedUserId && requestedUserId !== sessionUser.userId) {
          throw new Error("Phiên đăng nhập không khớp với userId yêu cầu");
        }
      }
      return {
        userId: sessionUser.userId,
        email: sessionUser.email,
      };
    }

    const fallbackUserId = String((userContext && userContext.userId) || "").trim();
    if (!fallbackUserId) {
      throw new Error("Không xác định được người dùng hiện tại");
    }

    const fallbackUser = this._findUserById(fallbackUserId);
    if (!fallbackUser || !fallbackUser.isActive) {
      throw new Error("Người dùng không hợp lệ hoặc đã bị khóa");
    }

    if (userContext && userContext.email) {
      const providedEmail = String(userContext.email || "").trim().toLowerCase();
      if (providedEmail && providedEmail !== String(fallbackUser.email || "").trim().toLowerCase()) {
        throw new Error("Email ngữ cảnh không khớp tài khoản");
      }
    }

    return {
      userId: fallbackUser.userId,
      email: fallbackUser.email,
    };
  },

  _findUserKeyRecord: function (userId) {
    this._ensureKeySheets();
    const sheet = getSheet("AI_User_Keys");
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1] || "").trim() === String(userId || "").trim()) {
        return {
          rowIndex: i + 1,
          values: data[i],
        };
      }
    }

    return null;
  },

  _logKeyUsage: function (usageData) {
    try {
      this._ensureKeySheets();
      const sheet = getSheet("AI_Key_Usage_Logs");
      if (!sheet) return;

      const usageId = generateNextId(sheet, "AKL");
      sheet.appendRow([
        usageId,
        usageData.userId || "",
        usageData.topicId || "",
        usageData.contentType || "",
        usageData.model || AI_CONFIG.GEMINI_MODEL_DEFAULT,
        usageData.status || "UNKNOWN",
        usageData.httpCode || "",
        usageData.errorMessage || "",
        usageData.durationMs || 0,
        new Date(),
      ]);
    } catch (error) {
      Logger.log("Error logging key usage: " + error.toString());
    }
  },

  /**
   * Lấy API Key từ Script Properties
   * @returns {string|null} API Key hoặc null nếu chưa setup
   */
  getApiKey: function (userContext) {
    try {
      const user = this.resolveAuthenticatedUser(userContext);
      const record = this._findUserKeyRecord(user.userId);
      if (!record || !record.values[4]) {
        return null;
      }

      const decrypted = this._decryptApiKey(record.values[4]);
      return this._normalizeApiKey(decrypted) || null;
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
  setupApiKey: function (apiKey, userContext) {
    try {
      this._lastSetupApiKeyError = "";
      const user = this.resolveAuthenticatedUser(userContext);
      const normalizedKey = this._normalizeApiKey(apiKey);

      if (!this._isValidApiKeyFormat(normalizedKey)) {
        throw new Error("Định dạng Gemini API key không hợp lệ");
      }

      const validated = this.validateUserApiKey(user, normalizedKey);
      if (!validated.success) {
        throw new Error(validated.message || "API key không hợp lệ");
      }

      this._ensureKeySheets();
      const sheet = getSheet("AI_User_Keys");
      if (!sheet) {
        throw new Error("AI_User_Keys sheet not found");
      }

      const encryptedKey = this._encryptApiKey(normalizedKey);
      const keyHash = this._hashApiKey(normalizedKey);
      const now = new Date();
      const record = this._findUserKeyRecord(user.userId);

      if (record) {
        sheet.getRange(record.rowIndex, 3).setValue(this._maskApiKey(normalizedKey));
        sheet.getRange(record.rowIndex, 4).setValue(keyHash);
        sheet.getRange(record.rowIndex, 5).setValue(encryptedKey);
        sheet.getRange(record.rowIndex, 6).setValue(true);
        sheet.getRange(record.rowIndex, 7).setValue("ACTIVE");
        sheet.getRange(record.rowIndex, 8).setValue(now);
        sheet.getRange(record.rowIndex, 10).setValue("");
        sheet.getRange(record.rowIndex, 12).setValue(now);
      } else {
        const keyId = generateNextId(sheet, "AUK");
        sheet.appendRow([
          keyId,
          user.userId,
          this._maskApiKey(normalizedKey),
          keyHash,
          encryptedKey,
          true,
          "ACTIVE",
          now,
          "",
          "",
          now,
          now,
        ]);
      }

      logActivity({
        level: "INFO",
        category: "AI",
        userId: user.userId,
        action: "UPSERT_GEMINI_API_KEY",
        details: "Updated personal Gemini API key",
      });

      return true;
    } catch (error) {
      this._lastSetupApiKeyError =
        (error && (error.message || error.toString())) ||
        "Không rõ nguyên nhân";
      Logger.log(
        "Error setting API key: " + this._lastSetupApiKeyError,
      );
      return false;
    }
  },

  /**
   * Kiểm tra API Key có hoạt động không
   * @returns {Object} Status và thông tin
   */
  testConnection: function (userContext) {
    try {
      const apiKey = this.getApiKey(userContext);
      if (!apiKey) {
        return {
          success: false,
          code: "AI_KEY_NOT_CONFIGURED",
          message: "Bạn chưa cấu hình Gemini API key cá nhân trong Profile/Settings.",
        };
      }

      // Test với request đơn giản
      const testPrompt = "Respond with exactly: CONNECTION_OK";
      const response = this._callAPI(testPrompt, { maxTokens: 50 }, userContext);

      if (response && response.includes("CONNECTION_OK")) {
        return {
          success: true,
          message: "✅ Gemini API key cá nhân hoạt động bình thường!",
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
  _callAPI: function (prompt, config = {}, userContext) {
    const user = this.resolveAuthenticatedUser(userContext);
    const apiKey = this.getApiKey(user);
    if (!apiKey) {
      const keyError = new Error(
        "Bạn chưa cấu hình Gemini API key cá nhân. Vui lòng cập nhật trong Profile/Settings.",
      );
      keyError.code = "AI_KEY_NOT_CONFIGURED";
      throw keyError;
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

    const keyRecord = this._findUserKeyRecord(user.userId);
    if (keyRecord) {
      const now = new Date();
      const sheet = getSheet("AI_User_Keys");
      if (sheet) {
        sheet.getRange(keyRecord.rowIndex, 9).setValue(now);
        sheet.getRange(keyRecord.rowIndex, 12).setValue(now);
      }
    }

    if (responseCode !== 200) {
      let errorMsg = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorMsg = errorJson.error?.message || responseText;
      } catch (e) {}

      if (keyRecord) {
        const sheet = getSheet("AI_User_Keys");
        if (sheet) {
          sheet.getRange(keyRecord.rowIndex, 6).setValue(false);
          sheet.getRange(keyRecord.rowIndex, 7).setValue("ERROR");
          sheet.getRange(keyRecord.rowIndex, 10).setValue(errorMsg);
          sheet.getRange(keyRecord.rowIndex, 12).setValue(new Date());
        }
      }

      this._logKeyUsage({
        userId: user.userId,
        topicId: config.topicId || "",
        contentType: config.contentType || "",
        model: model,
        status: "FAILED",
        httpCode: responseCode,
        errorMessage: errorMsg,
        durationMs: processingTime,
      });

      throw new Error("Gemini API Error (" + responseCode + "): " + errorMsg);
    }

    const json = JSON.parse(responseText);

    if (json.error) {
      this._logKeyUsage({
        userId: user.userId,
        topicId: config.topicId || "",
        contentType: config.contentType || "",
        model: model,
        status: "FAILED",
        httpCode: 200,
        errorMessage: json.error.message || "Gemini API Error",
        durationMs: processingTime,
      });
      throw new Error("Gemini API Error: " + json.error.message);
    }

    // Extract text từ response
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      this._logKeyUsage({
        userId: user.userId,
        topicId: config.topicId || "",
        contentType: config.contentType || "",
        model: model,
        status: "FAILED",
        httpCode: 200,
        errorMessage: "Empty response from Gemini API",
        durationMs: processingTime,
      });
      throw new Error("Empty response from Gemini API");
    }

    this._logKeyUsage({
      userId: user.userId,
      topicId: config.topicId || "",
      contentType: config.contentType || "",
      model: model,
      status: "SUCCESS",
      httpCode: 200,
      errorMessage: "",
      durationMs: processingTime,
    });

    // Mark key as active/valid
    if (keyRecord) {
      const sheet = getSheet("AI_User_Keys");
      if (sheet) {
        sheet.getRange(keyRecord.rowIndex, 6).setValue(true);
        sheet.getRange(keyRecord.rowIndex, 7).setValue("ACTIVE");
        sheet.getRange(keyRecord.rowIndex, 10).setValue("");
        sheet.getRange(keyRecord.rowIndex, 12).setValue(new Date());
      }
    }

    Logger.log(
      "✅ Gemini API call successful for user " +
        user.userId +
        ". Time: " +
        processingTime +
        "ms",
    );

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
  callWithRetry: function (prompt, config = {}, userContext, maxRetries = 2) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return this._callAPI(prompt, config, userContext);
      } catch (error) {
        lastError = error;
        const errorStr = error.toString();

        if (error.code === "AI_KEY_NOT_CONFIGURED") {
          throw error;
        }

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

  validateUserApiKey: function (userContext, apiKey) {
    try {
      const user = this.resolveAuthenticatedUser(userContext);
      const keyToTest = this._normalizeApiKey(apiKey || this.getApiKey(user));

      if (!keyToTest) {
        return {
          success: false,
          code: "AI_KEY_NOT_CONFIGURED",
          message: "Bạn chưa cấu hình Gemini API key cá nhân.",
        };
      }

      if (!this._isValidApiKeyFormat(keyToTest)) {
        return {
          success: false,
          code: "AI_KEY_FORMAT_INVALID",
          message: "Định dạng API key không hợp lệ.",
        };
      }

      const modelPath = "models/" + AI_CONFIG.GEMINI_MODEL_DEFAULT;
      const url = this.API_ENDPOINT + modelPath + ":generateContent?key=" + keyToTest;
      const payload = {
        contents: [{ parts: [{ text: "Respond exactly: VALID" }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 16,
        },
      };

      const response = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });

      const code = response.getResponseCode();
      if (code !== 200) {
        let message = response.getContentText();
        try {
          const errorJson = JSON.parse(message);
          message = errorJson.error?.message || message;
        } catch (e) {}

        return {
          success: false,
          code: "AI_KEY_INVALID",
          message: "Gemini từ chối API key: " + message,
          httpCode: code,
        };
      }

      return {
        success: true,
        message: "API key hợp lệ",
        userId: user.userId,
      };
    } catch (error) {
      return {
        success: false,
        code: "AI_KEY_VALIDATE_ERROR",
        message: error.toString(),
      };
    }
  },

  getUserApiKeyStatus: function (userContext) {
    try {
      const user = this.resolveAuthenticatedUser(userContext);
      const record = this._findUserKeyRecord(user.userId);

      if (!record) {
        return {
          success: true,
          hasKey: false,
          isValid: false,
          status: "NOT_CONFIGURED",
          message: "Chưa cấu hình Gemini API key",
        };
      }

      return {
        success: true,
        hasKey: !!record.values[4],
        isValid: record.values[5] === true || record.values[5] === "TRUE",
        status: record.values[6] || "UNKNOWN",
        keyAlias: record.values[2] || "",
        lastValidatedAt: record.values[7] || "",
        lastUsedAt: record.values[8] || "",
        lastError: record.values[9] || "",
      };
    } catch (error) {
      return {
        success: false,
        hasKey: false,
        isValid: false,
        status: "ERROR",
        message: error.toString(),
      };
    }
  },

  deleteUserApiKey: function (userContext) {
    try {
      const user = this.resolveAuthenticatedUser(userContext);
      const record = this._findUserKeyRecord(user.userId);
      if (!record) {
        return {
          success: true,
          message: "Không có API key để xóa",
        };
      }

      const sheet = getSheet("AI_User_Keys");
      if (!sheet) {
        throw new Error("AI_User_Keys sheet not found");
      }

      sheet.getRange(record.rowIndex, 3).setValue("");
      sheet.getRange(record.rowIndex, 4).setValue("");
      sheet.getRange(record.rowIndex, 5).setValue("");
      sheet.getRange(record.rowIndex, 6).setValue(false);
      sheet.getRange(record.rowIndex, 7).setValue("DELETED");
      sheet.getRange(record.rowIndex, 8).setValue("");
      sheet.getRange(record.rowIndex, 9).setValue("");
      sheet.getRange(record.rowIndex, 10).setValue("");
      sheet.getRange(record.rowIndex, 12).setValue(new Date());

      logActivity({
        level: "INFO",
        category: "AI",
        userId: user.userId,
        action: "DELETE_GEMINI_API_KEY",
        details: "Removed personal Gemini API key",
      });

      return {
        success: true,
        message: "Đã xóa Gemini API key cá nhân",
      };
    } catch (error) {
      return {
        success: false,
        message: error.toString(),
      };
    }
  },

  requireUserApiKey: function (userContext) {
    const user = this.resolveAuthenticatedUser(userContext);
    const apiKey = this.getApiKey(user);

    if (!apiKey) {
      const error = new Error(
        "Bạn chưa cấu hình Gemini API key cá nhân. Vui lòng vào Profile/Settings để thêm key.",
      );
      error.code = "AI_KEY_NOT_CONFIGURED";
      throw error;
    }

    return {
      userId: user.userId,
      email: user.email,
      apiKey: apiKey,
    };
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
 * Deprecated: hệ thống hiện dùng API key theo từng user.
 */
function ADMIN_setupGeminiApiKey() {
  Logger.log(
    "ADMIN_setupGeminiApiKey is deprecated. Use upsertUserGeminiApiKey(userId, apiKey) instead.",
  );
  return {
    success: false,
    message:
      "Deprecated: hệ thống dùng key cá nhân theo user. Vui lòng cấu hình trong Profile/Settings.",
  };
}

/**
 * [ADMIN] Test Gemini API Connection
 */
function ADMIN_testGeminiConnection() {
  const result = GeminiService.testConnection({});
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

function getUserGeminiKeyStatus(userId) {
  return GeminiService.getUserApiKeyStatus({ userId: userId });
}

function validateUserGeminiApiKey(userId, apiKey) {
  return GeminiService.validateUserApiKey({ userId: userId }, apiKey);
}

function upsertUserGeminiApiKey(userId, apiKey) {
  try {
    const success = GeminiService.setupApiKey(apiKey, { userId: userId });
    if (!success) {
      const validated = GeminiService.validateUserApiKey(
        { userId: userId },
        apiKey,
      );

      const detailedMessage =
        GeminiService._lastSetupApiKeyError ||
        validated?.message ||
        "Không thể lưu API key. Vui lòng thử lại.";

      return {
        success: false,
        code: validated?.code || "AI_KEY_SAVE_FAILED",
        message: detailedMessage,
      };
    }

    const status = GeminiService.getUserApiKeyStatus({ userId: userId });
    return {
      success: true,
      message: "Đã lưu API key cá nhân thành công",
      status: status,
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString(),
    };
  }
}

function deleteUserGeminiApiKey(userId) {
  return GeminiService.deleteUserApiKey({ userId: userId });
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
