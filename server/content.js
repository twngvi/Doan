/**
 * content.js - Lesson Content Management
 *
 * Xử lý việc lấy nội dung bài học từ Google Docs
 */

/**
 * Lấy nội dung HTML từ Google Doc
 * @param {string} docId - ID của file Google Doc
 * @returns {object} - {success, content, message}
 */
function getTopicContentByDocId(docId) {
  try {
    Logger.log("=== GET TOPIC CONTENT ===");
    Logger.log("Doc ID: " + docId);
    Logger.log("Doc ID type: " + typeof docId);

    // Validate input
    if (!docId || docId === "" || docId === "undefined" || docId === "null") {
      Logger.log("Invalid docId: " + docId);
      return {
        success: false,
        content: "",
        message: "Chưa có nội dung cho bài học này.",
      };
    }

    // Clean docId (remove whitespace)
    docId = String(docId).trim();
    Logger.log("Cleaned Doc ID: " + docId);

    // ⭐ KIỂM TRA QUYỀN TRUY CẬP DOC TRƯỚC KHI GỌI API
    try {
      const testFile = DriveApp.getFileById(docId);
      const fileName = testFile.getName();
      Logger.log("✅ Doc accessible: " + fileName);
    } catch (permissionError) {
      Logger.log("❌ Cannot access doc: " + permissionError.toString());
      return {
        success: false,
        content: "",
        message:
          "Lỗi: Không có quyền truy cập tài liệu.\n\n" +
          "Vui lòng:\n" +
          "1. Kiểm tra Doc ID: " +
          docId +
          "\n" +
          "2. Chia sẻ Doc với 'Anyone with link can view'\n" +
          "3. Hoặc chia sẻ trực tiếp với email của Apps Script project",
      };
    }

    // URL API để convert Doc sang HTML
    const url =
      "https://www.googleapis.com/drive/v3/files/" +
      docId +
      "/export?mimeType=text/html";

    Logger.log("Fetching URL: " + url);

    // Gọi API với quyền của Script hiện tại
    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken(),
      },
      muteHttpExceptions: true,
    });

    const responseCode = response.getResponseCode();
    Logger.log("Response code: " + responseCode);

    if (responseCode !== 200) {
      Logger.log("Error response: " + response.getContentText());

      let errorMessage = "Lỗi: Không thể tải bài học.";

      if (responseCode === 404) {
        errorMessage =
          "Lỗi 404: Không tìm thấy tài liệu.\n\n" +
          "Doc ID: " +
          docId +
          "\n\n" +
          "Vui lòng kiểm tra lại Doc ID trong bảng Topics.";
      } else if (responseCode === 403) {
        errorMessage =
          "Lỗi 403: Không có quyền truy cập.\n\n" +
          "Vui lòng chia sẻ Google Doc với:\n" +
          "- 'Anyone with link can view', hoặc\n" +
          "- Email của Apps Script project";
      } else if (responseCode === 401) {
        errorMessage = "Lỗi 401: Chưa được xác thực.\n\nVui lòng thử lại.";
      }

      return {
        success: false,
        content: "",
        message: errorMessage,
      };
    }

    let html = response.getContentText();
    Logger.log("Content loaded, length: " + html.length);

    // --- XỬ LÝ CSS & CLEANUP ---
    // Xóa bớt style mặc định của Google Doc để web app đẹp hơn

    // 1. Xóa style của body
    html = html.replace(/body\s*\{[^}]*\}/gi, "");

    // 2. Xóa padding/margin của p
    html = html.replace(/p\s*\{[^}]*\}/gi, "");

    // 3. Extract body content
    html = extractBodyContent(html);

    // 4. Thêm class wrapper để style dễ hơn
    html = '<div class="lesson-content-wrapper">' + html + "</div>";

    Logger.log("Content processed successfully");

    return {
      success: true,
      content: html,
      message: "Đã tải nội dung bài học",
    };
  } catch (error) {
    Logger.log("Error in getTopicContentByDocId: " + error.toString());
    Logger.log("Error stack: " + error.stack);
    return {
      success: false,
      content: "",
      message: "Đã xảy ra lỗi khi tải nội dung: " + error.toString(),
    };
  }
}

// ========== AI CONTENT API ==========

/**
 * ⭐ WRAPPER FUNCTION cho Frontend
 * Google Apps Script có vấn đề serialize nested objects qua google.script.run
 * Function này đảm bảo response được trả về đúng cách
 */
function getAIContentForWeb(topicId, contentType, forceRegenerate) {
  Logger.log("🌐 getAIContentForWeb CALLED");
  Logger.log("Args: " + topicId + ", " + contentType + ", " + forceRegenerate);

  try {
    // Gọi function chính
    const result = getAIContent(topicId, contentType, forceRegenerate);

    Logger.log("📤 Web wrapper - result.success: " + result.success);
    Logger.log("📤 Web wrapper - data type: " + typeof result.data);

    // Đảm bảo trả về plain object
    const response = {
      success: result.success === true,
      data: result.data || null,
      message: result.message || "",
      fromCache: result.fromCache === true,
    };

    Logger.log(
      "📤 Web wrapper - final response keys: " +
        Object.keys(response).join(", "),
    );

    return response;
  } catch (error) {
    Logger.log("❌ Web wrapper error: " + error.toString());
    return {
      success: false,
      data: null,
      message: "Lỗi server: " + error.toString(),
      fromCache: false,
    };
  }
}

/**
 * Get AI-generated content for a topic
 * Checks cache first, generates new if not found or expired
 *
 * @param {string} topicId - Topic ID
 * @param {string} contentType - 'mindmap', 'flashcards', 'lesson_summary', 'infographic', 'questions'
 * @param {boolean} forceRegenerate - Force regenerate even if cached
 * @returns {object} - {success, data, message, fromCache}
 */
function getAIContent(topicId, contentType, forceRegenerate) {
  Logger.log("🚀 getAIContent CALLED");
  Logger.log(
    "Args: topicId=" +
      topicId +
      ", contentType=" +
      contentType +
      ", force=" +
      forceRegenerate,
  );

  // Set default for forceRegenerate
  if (forceRegenerate === undefined || forceRegenerate === null) {
    forceRegenerate = false;
  }

  try {
    Logger.log("=== GET AI CONTENT ===");
    Logger.log("Topic ID: " + topicId);
    Logger.log("Content Type: " + contentType);
    Logger.log("Force Regenerate: " + forceRegenerate);

    // Validate inputs
    if (!topicId) {
      Logger.log("❌ Missing topicId");
      return { success: false, message: "Thiếu Topic ID" };
    }

    const validTypes = [
      "mindmap",
      "flashcards",
      "lesson_summary",
      "infographic",
      "questions",
    ];
    if (!validTypes.includes(contentType)) {
      Logger.log("❌ Invalid contentType: " + contentType);
      return {
        success: false,
        message: "Content type không hợp lệ: " + contentType,
      };
    }

    // 1. Check cache first (if not forcing regenerate)
    Logger.log("🔍 Checking cache...");
    if (!forceRegenerate) {
      try {
        const cached = AIContentCache.get(topicId, contentType);
        Logger.log("📦 Cache result: " + (cached ? "FOUND" : "NOT FOUND"));

        if (cached && cached.content) {
          Logger.log("✅ Returning from cache");
          Logger.log("📦 Cache content type: " + typeof cached.content);

          // ⭐ FIX: Trả về object đơn giản hơn để tránh lỗi serialization
          // Google Apps Script có vấn đề với nested objects lớn
          try {
            const dataString = JSON.stringify(cached.content);
            Logger.log("📦 Data size: " + dataString.length + " chars");

            // Tạo response object đơn giản
            const result = {
              success: true,
              data: dataString,
              message: "Đã tải từ cache",
              fromCache: true,
            };

            Logger.log(
              "📤 Returning result with data length: " + dataString.length,
            );
            return result;
          } catch (stringifyError) {
            Logger.log("❌ Stringify error: " + stringifyError.toString());
            return {
              success: false,
              message:
                "Lỗi khi serialize dữ liệu: " + stringifyError.toString(),
            };
          }
        }
      } catch (cacheError) {
        Logger.log("⚠️ Cache error (continuing): " + cacheError.toString());
      }
    }

    // 2. Get topic info to find Google Doc ID
    Logger.log("🔍 Getting topic info...");
    const topicInfo = getTopicInfo(topicId);
    Logger.log("📋 Topic info: " + JSON.stringify(topicInfo));

    if (!topicInfo || !topicInfo.contentDocId) {
      Logger.log("❌ No contentDocId found");
      return {
        success: false,
        message: "Không tìm thấy Google Doc cho topic này",
      };
    }

    Logger.log("📄 Found Doc ID: " + topicInfo.contentDocId);

    // 3. Read Google Doc content
    const docResult = GeminiService.readGoogleDoc(topicInfo.contentDocId);
    if (!docResult.success) {
      return {
        success: false,
        message: "Không thể đọc Google Doc: " + docResult.error,
      };
    }

    Logger.log("📝 Doc content loaded: " + docResult.wordCount + " words");

    // 3.5: Phải tạo Analysis trước (QUAN TRỌNG!)
    Logger.log("🔍 Analyzing document first...");
    const analysis = ContentGenerator.analyzeDocument(docResult.content);

    if (!analysis || analysis.error) {
      return {
        success: false,
        message:
          "Không thể phân tích tài liệu: " +
          (analysis?.error || "Unknown error"),
      };
    }

    Logger.log(
      "✅ Document analyzed: " + (analysis.mainTopic || "Unknown topic"),
    );

    // 4. Generate content using AI (với đầy đủ tham số)
    let generatedContent;

    switch (contentType) {
      case "mindmap":
        generatedContent = ContentGenerator.generateMindmap(
          docResult.content,
          analysis,
        );
        break;
      case "flashcards":
        generatedContent = ContentGenerator.generateFlashcards(
          docResult.content,
          analysis,
        );
        break;
      case "lesson_summary":
        generatedContent = ContentGenerator.generateLessonSummary(
          docResult.content,
          analysis,
        );
        break;
      case "infographic":
        generatedContent = ContentGenerator.generateInfographic(
          docResult.content,
          analysis,
        );
        break;
      case "questions":
        // Sửa tên hàm: generateMCQQuestions -> generateQuestions
        generatedContent = ContentGenerator.generateQuestions(
          docResult.content,
          analysis,
          { questionCount: 20 },
        );
        break;
      default:
        return { success: false, message: "Unsupported content type" };
    }

    if (!generatedContent || generatedContent.error) {
      return {
        success: false,
        message:
          "AI không thể tạo nội dung: " +
          (generatedContent?.error || "Unknown error"),
      };
    }

    Logger.log("✅ AI content generated successfully");

    // 5. Save to cache
    try {
      AIContentCache.save({
        topicId: topicId,
        contentDocId: topicInfo.contentDocId,
        contentType: contentType,
        generatedContent: generatedContent,
        promptUsed: "auto-generated",
        geminiModel: AI_CONFIG.GEMINI_MODEL_DEFAULT,
        docLastModified: docResult.lastModified || new Date().toISOString(),
      });
      Logger.log("💾 Saved to cache");
    } catch (cacheError) {
      Logger.log("⚠️ Cache save failed: " + cacheError.toString());
      // Continue anyway - content was generated successfully
    }

    // 6. Log generation
    try {
      logAIGeneration(topicId, contentType, true);
    } catch (logError) {
      Logger.log("⚠️ Log failed: " + logError.toString());
    }

    // ⭐ FIX: Trả về object đơn giản để tránh lỗi serialization
    try {
      const dataString = JSON.stringify(generatedContent);
      Logger.log("📤 New content data size: " + dataString.length + " chars");

      const result = {
        success: true,
        data: dataString,
        message: "Đã tạo nội dung mới bằng AI",
        fromCache: false,
      };

      return result;
    } catch (stringifyError) {
      Logger.log("❌ Stringify error: " + stringifyError.toString());
      return {
        success: false,
        message: "Lỗi khi serialize dữ liệu mới: " + stringifyError.toString(),
      };
    }
  } catch (error) {
    Logger.log("❌ Error in getAIContent: " + error.toString());
    Logger.log("Stack: " + error.stack);

    // Log failed generation
    try {
      logAIGeneration(topicId, contentType, false, error.toString());
    } catch (e) {}

    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Get topic info from MASTER_DB
 * @param {string} topicId
 * @returns {object|null}
 */
function getTopicInfo(topicId) {
  try {
    // Use DB_CONFIG from schemas.js
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    Logger.log("📋 getTopicInfo - Using DB ID: " + masterDbId);

    const masterDb = SpreadsheetApp.openById(masterDbId);
    const topicsSheet = masterDb.getSheetByName("Topics");

    if (!topicsSheet) {
      Logger.log("⚠️ Topics sheet not found");
      return null;
    }

    const data = topicsSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indices
    const topicIdCol = headers.indexOf("topicId");
    const contentDocIdCol = headers.indexOf("contentDocId");
    const titleCol = headers.indexOf("title");

    if (topicIdCol === -1) {
      Logger.log("⚠️ topicId column not found");
      return null;
    }

    // Find the topic row
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === topicId) {
        return {
          topicId: topicId,
          contentDocId:
            contentDocIdCol !== -1 ? data[i][contentDocIdCol] : null,
          title: titleCol !== -1 ? data[i][titleCol] : "Unknown Topic",
        };
      }
    }

    Logger.log("⚠️ Topic not found: " + topicId);
    return null;
  } catch (error) {
    Logger.log("❌ Error getting topic info: " + error.toString());
    return null;
  }
}

/**
 * Log AI generation attempt
 */
function logAIGeneration(topicId, contentType, success, errorMessage) {
  try {
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const masterDb = SpreadsheetApp.openById(masterDbId);
    let logsSheet = masterDb.getSheetByName("AI_Generation_Logs");

    if (!logsSheet) {
      // Create sheet if not exists
      logsSheet = masterDb.insertSheet("AI_Generation_Logs");
      logsSheet.appendRow([
        "logId",
        "topicId",
        "contentType",
        "success",
        "errorMessage",
        "generatedAt",
        "processingTime",
      ]);
    }

    const logId = "LOG" + Date.now();
    logsSheet.appendRow([
      logId,
      topicId,
      contentType,
      success,
      errorMessage || "",
      new Date().toISOString(),
      0, // Processing time - could be calculated
    ]);
  } catch (error) {
    Logger.log("⚠️ Could not log AI generation: " + error.toString());
  }
}

/**
 * Batch generate all AI content for a topic
 * @param {string} topicId
 * @returns {object}
 */
function generateAllAIContent(topicId) {
  Logger.log("=== GENERATE ALL AI CONTENT ===");
  Logger.log("Topic ID: " + topicId);

  const results = {};
  const contentTypes = ["mindmap", "flashcards", "lesson_summary"];

  for (const type of contentTypes) {
    Logger.log("Generating: " + type);
    results[type] = getAIContent(topicId, type, true);

    // Small delay between API calls to avoid rate limiting
    if (type !== contentTypes[contentTypes.length - 1]) {
      Utilities.sleep(2000);
    }
  }

  return {
    success: true,
    results: results,
    message: "Đã tạo tất cả nội dung AI",
  };
}

/**
 * Extract body content từ full HTML document
 */
function extractBodyContent(html) {
  try {
    // Tìm nội dung giữa <body> và </body>
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1];
    }
    return html;
  } catch (error) {
    Logger.log("Error extracting body: " + error.toString());
    return html;
  }
}

/**
 * Lấy thông tin metadata của Google Doc
 * @param {string} docId - ID của file Google Doc
 * @returns {object} - Metadata của file
 */
function getDocMetadata(docId) {
  try {
    Logger.log("=== GET DOC METADATA ===");
    Logger.log("Doc ID: " + docId);

    if (!docId || docId === "") {
      return {
        success: false,
        message: "Doc ID is required",
      };
    }

    const url =
      "https://www.googleapis.com/drive/v3/files/" +
      docId +
      "?fields=id,name,mimeType,createdTime,modifiedTime,size";

    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken(),
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      const metadata = JSON.parse(response.getContentText());
      Logger.log("Metadata retrieved: " + JSON.stringify(metadata));
      return {
        success: true,
        metadata: metadata,
      };
    }

    Logger.log("Failed to get metadata: " + response.getResponseCode());
    return {
      success: false,
      message: "Không thể lấy metadata",
    };
  } catch (error) {
    Logger.log("Error in getDocMetadata: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Get user's personal sheet ID by email
 * @param {string} email - User email
 * @returns {string|null} - progressSheetId or null
 */
function getUserProgressSheetIdByEmail(email) {
  try {
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      Logger.log("Users sheet not found");
      return null;
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const progressSheetIdIndex = headers.indexOf("progressSheetId");

    if (emailIndex === -1 || progressSheetIdIndex === -1) {
      Logger.log("Required columns not found");
      return null;
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        const sheetId = data[i][progressSheetIdIndex];
        Logger.log("Found progressSheetId for " + email + ": " + sheetId);
        return sheetId || null;
      }
    }

    Logger.log("User not found: " + email);
    return null;
  } catch (error) {
    Logger.log("Error getting progressSheetId: " + error.toString());
    return null;
  }
}

/**
 * Get or create Quiz_Results sheet in user's personal sheet
 * @param {Spreadsheet} spreadsheet - User's spreadsheet
 * @returns {Sheet} - Quiz_Results sheet
 */
function getOrCreateQuizResultsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("Quiz_Results");

  if (!sheet) {
    Logger.log("Creating Quiz_Results sheet...");
    sheet = spreadsheet.insertSheet("Quiz_Results");
    sheet.appendRow([
      "id",
      "topicId",
      "topicTitle",
      "score",
      "totalQuestions",
      "percentage",
      "timeTaken",
      "gameMode",
      "status",
      "currentQuestionIndex",
      "completedAt",
      "questionDetails",
    ]);

    // Style header
    const headerRange = sheet.getRange(1, 1, 1, 12);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5B6FF8");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Get or create Wrong_Answers sheet in user's personal sheet
 * @param {Spreadsheet} spreadsheet - User's spreadsheet
 * @returns {Sheet} - Wrong_Answers sheet
 */
function getOrCreateWrongAnswersSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("Wrong_Answers");

  if (!sheet) {
    Logger.log("Creating Wrong_Answers sheet...");
    sheet = spreadsheet.insertSheet("Wrong_Answers");
    sheet.appendRow([
      "id",
      "topicId",
      "questionId",
      "question",
      "selectedAnswer",
      "correctAnswer",
      "retryCount",
      "lastRetry",
      "mastered",
      "createdAt",
    ]);

    // Style header
    const headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#DC2626");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Save quiz result to user's PERSONAL Google Sheet
 * @param {object} resultData - Quiz result data
 * @returns {object} - {success, message}
 */
function saveQuizResult(resultData) {
  try {
    Logger.log("=== SAVE QUIZ RESULT TO PERSONAL SHEET ===");
    Logger.log("Result data: " + JSON.stringify(resultData));

    // Get current user email
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      Logger.log("⚠️ No user email, cannot save to personal sheet");
      return { success: false, message: "User not logged in" };
    }
    Logger.log("User email: " + userEmail);

    // Get user's personal sheet ID
    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      Logger.log("⚠️ User doesn't have personal sheet");
      return { success: false, message: "User personal sheet not found" };
    }
    Logger.log("Personal sheet ID: " + progressSheetId);

    // Open user's personal spreadsheet
    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = getOrCreateQuizResultsSheet(userSpreadsheet);

    // Create result entry
    const resultEntry = [
      "QR_" + Date.now(), // id
      resultData.topicId, // topicId
      resultData.topicTitle, // topicTitle
      resultData.score, // score
      resultData.totalQuestions, // totalQuestions
      resultData.percentage, // percentage
      resultData.timeTaken, // timeTaken
      resultData.gameMode || "instant", // gameMode
      resultData.status || "complete", // status (partial/complete)
      resultData.currentQuestionIndex || 0, // currentQuestionIndex
      new Date().toISOString(), // completedAt
      JSON.stringify(resultData.answers || resultData.questionDetails || []), // questionDetails
    ];

    // Append to sheet
    quizSheet.appendRow(resultEntry);

    Logger.log("✅ Quiz result saved to PERSONAL sheet successfully");

    return {
      success: true,
      message: "Quiz result saved to personal sheet",
    };
  } catch (error) {
    Logger.log("❌ Error saving quiz result: " + error.toString());
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Get or create Activity_Log sheet in user's personal sheet
 * Columns: id, type (Learning/MCQ/Matching), topicId, topicTitle, score, totalQuestions, percentage, timestamp
 */
function getOrCreateActivityLogSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("Activity_Log");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Activity_Log");
    sheet.appendRow([
      "id",
      "type",
      "topicId",
      "topicTitle",
      "score",
      "totalQuestions",
      "percentage",
      "timestamp",
    ]);
    const headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#6366F1");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Save an activity to the user's personal Activity_Log sheet
 * @param {object} data - { type: "Learning"|"MCQ"|"Matching", topicId, topicTitle, score?, totalQuestions?, percentage? }
 */
function saveActivityLog(data) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "No personal sheet" };
    }

    const spreadsheet = SpreadsheetApp.openById(progressSheetId);
    const sheet = getOrCreateActivityLogSheet(spreadsheet);

    const now = new Date();
    sheet.appendRow([
      "ACT_" + Date.now(),
      data.type || "Learning",
      data.topicId || "",
      data.topicTitle || "",
      data.score != null ? data.score : "",
      data.totalQuestions != null ? data.totalQuestions : "",
      data.percentage != null ? data.percentage : "",
      now.toISOString(),
    ]);

    Logger.log("✅ Activity saved: " + data.type + " - " + data.topicTitle);
    return { success: true };
  } catch (error) {
    Logger.log("❌ Error saving activity: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get all dashboard data in a single API call
 * Returns: quickStats (XP, accuracy, badges, rank), activities, quests, skillProgress, leaderboard
 */
function getDashboardData() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in" };
    }

    // === 1. Read from Master DB (User row) ===
    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    const allData = usersSheet.getDataRange().getValues();
    const headers = allData[0];

    const col = {};
    headers.forEach((h, i) => (col[h] = i));

    let userRow = null;
    let userRowIdx = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][col["email"]] === userEmail) {
        userRow = allData[i];
        userRowIdx = i;
        break;
      }
    }

    const totalXP = userRow ? parseInt(userRow[col["totalXP"]]) || 0 : 0;
    const totalQuizAnswered = userRow
      ? parseInt(userRow[col["totalQuizAnswered"]]) || 0
      : 0;
    const progressSheetId = userRow ? userRow[col["progressSheetId"]] : null;

    // === 2. Read personal sheet data ===
    let activities = [];
    let quizResults = [];
    let totalCorrect = 0;
    let totalQuestions = 0;
    let badges = 0;

    if (progressSheetId) {
      const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);

      // Activity Log
      const actSheet = userSpreadsheet.getSheetByName("Activity_Log");
      if (actSheet) {
        const actData = actSheet.getDataRange().getValues();
        const actHeaders = actData[0];
        const ac = {};
        actHeaders.forEach((h, i) => (ac[h] = i));

        for (let i = 1; i < actData.length; i++) {
          activities.push({
            type: ac["type"] >= 0 ? actData[i][ac["type"]] : "",
            topicId: ac["topicId"] >= 0 ? actData[i][ac["topicId"]] : "",
            topicTitle:
              ac["topicTitle"] >= 0 ? actData[i][ac["topicTitle"]] : "",
            score:
              ac["score"] >= 0 && actData[i][ac["score"]] !== ""
                ? parseInt(actData[i][ac["score"]])
                : null,
            totalQuestions:
              ac["totalQuestions"] >= 0 &&
              actData[i][ac["totalQuestions"]] !== ""
                ? parseInt(actData[i][ac["totalQuestions"]])
                : null,
            percentage:
              ac["percentage"] >= 0 && actData[i][ac["percentage"]] !== ""
                ? parseInt(actData[i][ac["percentage"]])
                : null,
            timestamp:
              ac["timestamp"] >= 0 ? String(actData[i][ac["timestamp"]]) : "",
          });
        }
        activities.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );
        activities = activities.slice(0, 10);
      }

      // Quiz Results for accuracy calculation
      const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");
      if (quizSheet) {
        const qData = quizSheet.getDataRange().getValues();
        const qHeaders = qData[0];
        const qc = {};
        qHeaders.forEach((h, i) => (qc[h] = i));

        for (let i = 1; i < qData.length; i++) {
          const status =
            qc["status"] >= 0 ? qData[i][qc["status"]] : "complete";
          if (status === "partial") continue;
          const sc =
            qc["score"] >= 0 ? parseInt(qData[i][qc["score"]]) || 0 : 0;
          const tq =
            qc["totalQuestions"] >= 0
              ? parseInt(qData[i][qc["totalQuestions"]]) || 0
              : 0;
          totalCorrect += sc;
          totalQuestions += tq;
          quizResults.push({
            topicId: qc["topicId"] >= 0 ? qData[i][qc["topicId"]] : "",
            topicTitle: qc["topicTitle"] >= 0 ? qData[i][qc["topicTitle"]] : "",
            percentage:
              qc["percentage"] >= 0
                ? parseInt(qData[i][qc["percentage"]]) || 0
                : 0,
          });
        }
      }
    }

    const avgAccuracy =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    // Badges: count achievements
    if (totalXP >= 100) badges++;
    if (totalXP >= 500) badges++;
    if (totalXP >= 1000) badges++;
    if (avgAccuracy >= 80) badges++;
    if (quizResults.length >= 10) badges++;
    if (quizResults.length >= 50) badges++;
    const currentStreak = userRow
      ? parseInt(userRow[col["currentStreak"]]) || 0
      : 0;
    if (currentStreak >= 7) badges++;
    if (currentStreak >= 30) badges++;

    // === 3. Rank system ===
    let rankTitle = "Chưa xếp hạng";
    let rankIcon = "🌱";
    if (totalXP >= 5000) {
      rankTitle = "Hạng Kim Cương";
      rankIcon = "💎";
    } else if (totalXP >= 2000) {
      rankTitle = "Hạng Vàng";
      rankIcon = "🥇";
    } else if (totalXP >= 1000) {
      rankTitle = "Hạng Bạc";
      rankIcon = "🥈";
    } else if (totalXP >= 500) {
      rankTitle = "Hạng Đồng III";
      rankIcon = "🥉";
    } else if (totalXP >= 100) {
      rankTitle = "Hạng Sắt";
      rankIcon = "⚔️";
    } else if (totalXP > 0) {
      rankTitle = "Người mới";
      rankIcon = "🌱";
    }

    // === 4. Daily Quests ===
    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );
    const todayActivities = activities.filter(
      (a) => a.timestamp && a.timestamp.startsWith(today),
    );
    const todayLearning = todayActivities.filter(
      (a) => a.type === "Learning",
    ).length;
    const todayMCQ = todayActivities.filter((a) => a.type === "MCQ").length;
    const todayPerfect = todayActivities.filter(
      (a) => a.type === "MCQ" && a.percentage === 100,
    ).length;

    // Check if user checked in today
    let checkedInToday = false;
    if (progressSheetId) {
      try {
        const userSS = SpreadsheetApp.openById(progressSheetId);
        checkedInToday = hasCheckedInToday(userSS, today);
      } catch (e) {
        Logger.log("Error checking checkin: " + e.toString());
      }
    }

    // Check which quests have been claimed today (from XP_Log)
    let claimedQuests = {};
    if (progressSheetId) {
      try {
        const userSS = SpreadsheetApp.openById(progressSheetId);
        const xpSheet = userSS.getSheetByName("XP_Log");
        if (xpSheet) {
          const xpData = xpSheet.getDataRange().getValues();
          for (let i = 1; i < xpData.length; i++) {
            const xpDate = xpData[i][0];
            let dateStr;
            if (xpDate instanceof Date) {
              dateStr = Utilities.formatDate(
                xpDate,
                "Asia/Ho_Chi_Minh",
                "yyyy-MM-dd",
              );
            } else {
              dateStr = String(xpDate).trim();
            }
            if (dateStr === today) {
              claimedQuests[xpData[i][2]] = true; // questId column
            }
          }
        }
      } catch (e) {
        Logger.log("Error reading XP_Log: " + e.toString());
      }
    }

    const quests = [
      {
        questId: "daily_checkin",
        title: "Điểm danh hằng ngày",
        progress: checkedInToday ? 1 : 0,
        target: 1,
        xpReward: 20,
        done: checkedInToday,
        claimed: !!claimedQuests["daily_checkin"],
      },
      {
        questId: "daily_learn",
        title: "Học 1 bài học mới",
        progress: Math.min(todayLearning, 1),
        target: 1,
        xpReward: 30,
        done: todayLearning >= 1,
        claimed: !!claimedQuests["daily_learn"],
      },
      {
        questId: "daily_quiz",
        title: "Hoàn thành 1 bài Quiz",
        progress: Math.min(todayMCQ, 1),
        target: 1,
        xpReward: 50,
        done: todayMCQ >= 1,
        claimed: !!claimedQuests["daily_quiz"],
      },
      {
        questId: "daily_perfect",
        title: "Đạt điểm tuyệt đối 1 bài",
        progress: Math.min(todayPerfect, 1),
        target: 1,
        xpReward: 100,
        done: todayPerfect >= 1,
        claimed: !!claimedQuests["daily_perfect"],
      },
    ];

    // Check if all main quests are done => bonus quest
    const allMainDone = quests.every((q) => q.done);
    quests.push({
      questId: "daily_all_bonus",
      title: "🎉 Hoàn thành tất cả nhiệm vụ",
      progress: quests.filter((q) => q.done).length,
      target: quests.length,
      xpReward: 50,
      done: allMainDone,
      claimed: !!claimedQuests["daily_all_bonus"],
      isBonus: true,
    });

    // === 5. Skill progress from quiz results ===
    const topicScores = {};
    quizResults.forEach((r) => {
      if (!topicScores[r.topicTitle]) {
        topicScores[r.topicTitle] = { total: 0, count: 0 };
      }
      topicScores[r.topicTitle].total += r.percentage;
      topicScores[r.topicTitle].count++;
    });
    const skillProgress = Object.entries(topicScores)
      .map(([title, s]) => ({
        title: title,
        progress: Math.round(s.total / s.count),
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    // === 6. Leaderboard (top 10 from master DB) ===
    const leaderboard = [];
    for (let i = 1; i < allData.length; i++) {
      const xp = parseInt(allData[i][col["totalXP"]]) || 0;
      const isActive = allData[i][col["isActive"]];
      if (isActive === false || isActive === "FALSE") continue;
      leaderboard.push({
        name:
          allData[i][col["displayName"]] ||
          allData[i][col["username"]] ||
          "User",
        xp: xp,
        isMe: allData[i][col["email"]] === userEmail,
      });
    }
    leaderboard.sort((a, b) => b.xp - a.xp);

    // === 7. Smart suggestion (disabled) ===
    let suggestion = null;

    Logger.log("✅ getDashboardData: complete");
    return {
      success: true,
      quickStats: {
        totalXP: totalXP,
        avgAccuracy: avgAccuracy,
        badges: badges,
        rankTitle: rankTitle,
        rankIcon: rankIcon,
      },
      activities: activities,
      quests: quests,
      skillProgress: skillProgress,
      leaderboard: leaderboard.slice(0, 10),
      suggestion: suggestion,
    };
  } catch (error) {
    Logger.log("❌ Error in getDashboardData: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Claim XP reward for completing a daily quest
 * Saves XP to personal XP_Log sheet and updates totalXP in master DB
 * @param {string} questId - The quest identifier
 * @returns {Object} - { success, xpAwarded, newTotalXP, message }
 */
function completeQuestAndAwardXP(questId) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "Không tìm thấy sheet cá nhân" };
    }

    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);

    // Get or create XP_Log sheet
    let xpSheet = userSpreadsheet.getSheetByName("XP_Log");
    if (!xpSheet) {
      xpSheet = userSpreadsheet.insertSheet("XP_Log");
      xpSheet.appendRow([
        "date", // YYYY-MM-DD
        "timestamp", // ISO timestamp
        "questId", // quest identifier
        "questTitle", // quest display name
        "xpAmount", // XP awarded
        "source", // "daily_quest" or "bonus"
      ]);
      const headerRange = xpSheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#F59E0B");
      headerRange.setFontColor("white");
      xpSheet.setFrozenRows(1);
    }

    // Check if already claimed this quest today
    const xpData = xpSheet.getDataRange().getValues();
    for (let i = 1; i < xpData.length; i++) {
      const xpDate = xpData[i][0];
      let dateStr;
      if (xpDate instanceof Date) {
        dateStr = Utilities.formatDate(
          xpDate,
          "Asia/Ho_Chi_Minh",
          "yyyy-MM-dd",
        );
      } else {
        dateStr = String(xpDate).trim();
      }
      if (dateStr === today && xpData[i][2] === questId) {
        return {
          success: false,
          alreadyClaimed: true,
          message: "Đã nhận thưởng rồi!",
        };
      }
    }

    // Validate quest completion
    const questConfig = {
      daily_checkin: {
        title: "Điểm danh hằng ngày",
        xp: 20,
        source: "daily_quest",
      },
      daily_learn: {
        title: "Học 1 bài học mới",
        xp: 30,
        source: "daily_quest",
      },
      daily_quiz: {
        title: "Hoàn thành 1 bài Quiz",
        xp: 50,
        source: "daily_quest",
      },
      daily_perfect: {
        title: "Đạt điểm tuyệt đối 1 bài",
        xp: 100,
        source: "daily_quest",
      },
      daily_all_bonus: {
        title: "Hoàn thành tất cả nhiệm vụ",
        xp: 50,
        source: "bonus",
      },
    };

    const quest = questConfig[questId];
    if (!quest) {
      return { success: false, message: "Nhiệm vụ không hợp lệ" };
    }

    // Verify quest is actually done
    const verifyResult = verifyQuestCompletion(
      userSpreadsheet,
      questId,
      today,
      xpSheet,
    );
    if (!verifyResult.done) {
      return { success: false, message: "Nhiệm vụ chưa hoàn thành" };
    }

    // Save XP to XP_Log
    const now = new Date();
    xpSheet.appendRow([
      today,
      now.toISOString(),
      questId,
      quest.title,
      quest.xp,
      quest.source,
    ]);
    Logger.log("✅ XP logged: " + quest.xp + " for quest " + questId);

    // Update totalXP in master DB
    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf("email");
    const xpCol = headers.indexOf("totalXP");

    let newTotalXP = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === userEmail) {
        const currentXP = parseInt(data[i][xpCol]) || 0;
        newTotalXP = currentXP + quest.xp;
        usersSheet.getRange(i + 1, xpCol + 1).setValue(newTotalXP);
        Logger.log(
          "✅ Updated totalXP for " +
            userEmail +
            ": " +
            currentXP +
            " -> " +
            newTotalXP,
        );
        break;
      }
    }

    return {
      success: true,
      xpAwarded: quest.xp,
      newTotalXP: newTotalXP,
      questId: questId,
      message: "+" + quest.xp + " XP!",
    };
  } catch (error) {
    Logger.log("❌ Error in completeQuestAndAwardXP: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Verify that a quest has actually been completed today
 * @param {Spreadsheet} spreadsheet - User's personal spreadsheet
 * @param {string} questId - Quest identifier
 * @param {string} today - Today YYYY-MM-DD
 * @param {Sheet} xpSheet - XP_Log sheet (for bonus check)
 * @returns {Object} { done: boolean }
 */
function verifyQuestCompletion(spreadsheet, questId, today, xpSheet) {
  try {
    switch (questId) {
      case "daily_checkin": {
        return { done: hasCheckedInToday(spreadsheet, today) };
      }
      case "daily_learn":
      case "daily_quiz":
      case "daily_perfect": {
        const actSheet = spreadsheet.getSheetByName("Activity_Log");
        if (!actSheet) return { done: false };
        const actData = actSheet.getDataRange().getValues();
        const actHeaders = actData[0];
        const ac = {};
        actHeaders.forEach((h, i) => (ac[h] = i));

        let todayLearning = 0,
          todayMCQ = 0,
          todayPerfect = 0;
        for (let i = 1; i < actData.length; i++) {
          const ts =
            ac["timestamp"] >= 0 ? String(actData[i][ac["timestamp"]]) : "";
          if (!ts.startsWith(today)) continue;
          const type = ac["type"] >= 0 ? actData[i][ac["type"]] : "";
          if (type === "Learning") todayLearning++;
          if (type === "MCQ") {
            todayMCQ++;
            const pct =
              ac["percentage"] >= 0
                ? parseInt(actData[i][ac["percentage"]])
                : 0;
            if (pct === 100) todayPerfect++;
          }
        }

        if (questId === "daily_learn") return { done: todayLearning >= 1 };
        if (questId === "daily_quiz") return { done: todayMCQ >= 1 };
        if (questId === "daily_perfect") return { done: todayPerfect >= 1 };
        return { done: false };
      }
      case "daily_all_bonus": {
        // All 4 main quests must be claimed
        const mainQuestIds = [
          "daily_checkin",
          "daily_learn",
          "daily_quiz",
          "daily_perfect",
        ];
        const xpData = xpSheet.getDataRange().getValues();
        const claimedToday = new Set();
        for (let i = 1; i < xpData.length; i++) {
          const xpDate = xpData[i][0];
          let dateStr;
          if (xpDate instanceof Date) {
            dateStr = Utilities.formatDate(
              xpDate,
              "Asia/Ho_Chi_Minh",
              "yyyy-MM-dd",
            );
          } else {
            dateStr = String(xpDate).trim();
          }
          if (dateStr === today) {
            claimedToday.add(xpData[i][2]);
          }
        }
        const allClaimed = mainQuestIds.every((id) => claimedToday.has(id));
        return { done: allClaimed };
      }
      default:
        return { done: false };
    }
  } catch (error) {
    Logger.log("Error verifying quest: " + error.toString());
    return { done: false };
  }
}

/**
 * Get recent activities from user's personal Activity_Log sheet
 * @param {number} limit - Max number of activities to return (default 10)
 * @returns {object} - { success, activities: [...] }
 */
function getActivityLog(limit) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", activities: [] };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: true, activities: [] };
    }

    const spreadsheet = SpreadsheetApp.openById(progressSheetId);
    const sheet = spreadsheet.getSheetByName("Activity_Log");

    if (!sheet) {
      return { success: true, activities: [] };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, activities: [] };
    }

    const headers = data[0];
    const typeCol = headers.indexOf("type");
    const topicIdCol = headers.indexOf("topicId");
    const topicTitleCol = headers.indexOf("topicTitle");
    const scoreCol = headers.indexOf("score");
    const totalQCol = headers.indexOf("totalQuestions");
    const percentCol = headers.indexOf("percentage");
    const tsCol = headers.indexOf("timestamp");

    const activities = [];
    for (let i = 1; i < data.length; i++) {
      activities.push({
        type: typeCol >= 0 ? data[i][typeCol] : "",
        topicId: topicIdCol >= 0 ? data[i][topicIdCol] : "",
        topicTitle: topicTitleCol >= 0 ? data[i][topicTitleCol] : "",
        score:
          scoreCol >= 0 && data[i][scoreCol] !== ""
            ? parseInt(data[i][scoreCol])
            : null,
        totalQuestions:
          totalQCol >= 0 && data[i][totalQCol] !== ""
            ? parseInt(data[i][totalQCol])
            : null,
        percentage:
          percentCol >= 0 && data[i][percentCol] !== ""
            ? parseInt(data[i][percentCol])
            : null,
        timestamp: tsCol >= 0 ? String(data[i][tsCol]) : "",
      });
    }

    // Sort by timestamp descending (most recent first) and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const maxItems = limit || 10;

    Logger.log(
      "✅ getActivityLog: returned " +
        Math.min(activities.length, maxItems) +
        " activities",
    );
    return { success: true, activities: activities.slice(0, maxItems) };
  } catch (error) {
    Logger.log("❌ Error in getActivityLog: " + error.toString());
    return { success: false, message: error.toString(), activities: [] };
  }
}

/**
 * Get all quiz results for the current user from their personal Google Sheet
 * Used by dashboard to show recent activity
 * @returns {object} - { success, results: [...] }
 */
function getUserQuizResults() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", results: [] };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: true, results: [] };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");

    if (!quizSheet) {
      return { success: true, results: [] };
    }

    const data = quizSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, results: [] };
    }

    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const topicTitleCol = headers.indexOf("topicTitle");
    const scoreCol = headers.indexOf("score");
    const totalQuestionsCol = headers.indexOf("totalQuestions");
    const percentageCol = headers.indexOf("percentage");
    const timeTakenCol = headers.indexOf("timeTaken");
    const gameModeCol = headers.indexOf("gameMode");
    const statusCol = headers.indexOf("status");
    const completedAtCol = headers.indexOf("completedAt");

    const results = [];
    for (let i = 1; i < data.length; i++) {
      const status = statusCol >= 0 ? data[i][statusCol] : "complete";
      // Only include completed quizzes
      if (status === "partial") continue;

      results.push({
        topicId: topicIdCol >= 0 ? data[i][topicIdCol] : "",
        topicTitle: topicTitleCol >= 0 ? data[i][topicTitleCol] : "Chủ đề",
        score: scoreCol >= 0 ? parseInt(data[i][scoreCol]) || 0 : 0,
        totalQuestions:
          totalQuestionsCol >= 0
            ? parseInt(data[i][totalQuestionsCol]) || 0
            : 0,
        percentage:
          percentageCol >= 0 ? parseInt(data[i][percentageCol]) || 0 : 0,
        timeTaken: timeTakenCol >= 0 ? data[i][timeTakenCol] : null,
        quizType: gameModeCol >= 0 ? data[i][gameModeCol] : "quiz",
        completedAt: completedAtCol >= 0 ? data[i][completedAtCol] : null,
      });
    }

    // Sort by completedAt descending (most recent first)
    results.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt) : new Date(0);
      const dateB = b.completedAt ? new Date(b.completedAt) : new Date(0);
      return dateB - dateA;
    });

    Logger.log(
      "✅ getUserQuizResults: returned " + results.length + " results",
    );
    return { success: true, results: results };
  } catch (error) {
    Logger.log("❌ Error in getUserQuizResults: " + error.toString());
    return { success: false, message: error.toString(), results: [] };
  }
}

/**
 * Get saved progress for a topic (partial quiz)
 * @param {string} topicId - Topic ID
 * @returns {object} - Saved progress or null
 */
function getSavedQuizProgress(topicId) {
  try {
    Logger.log("=== GET SAVED QUIZ PROGRESS ===");
    Logger.log("Topic ID: " + topicId);

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return null;
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return null;
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");

    if (!quizSheet) {
      return null;
    }

    const data = quizSheet.getDataRange().getValues();
    const headers = data[0];

    const topicIdCol = headers.indexOf("topicId");
    const statusCol = headers.indexOf("status");
    const currentIndexCol = headers.indexOf("currentQuestionIndex");
    const questionDetailsCol = headers.indexOf("questionDetails");
    const gameModeCol = headers.indexOf("gameMode");
    const scoreCol = headers.indexOf("score");

    // Find the latest partial progress for this topic
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][topicIdCol] === topicId && data[i][statusCol] === "partial") {
        Logger.log("✅ Found saved progress at row " + (i + 1));

        let questionDetails = [];
        try {
          questionDetails = JSON.parse(data[i][questionDetailsCol] || "[]");
        } catch (e) {
          Logger.log("Error parsing questionDetails: " + e);
        }

        return {
          rowIndex: i + 1, // For deletion later
          topicId: data[i][topicIdCol],
          currentQuestionIndex: data[i][currentIndexCol] || 0,
          gameMode: data[i][gameModeCol] || "instant",
          score: data[i][scoreCol] || 0,
          questionDetails: questionDetails,
        };
      }
    }

    Logger.log("No saved progress found");
    return null;
  } catch (error) {
    Logger.log("❌ Error getting saved progress: " + error.toString());
    return null;
  }
}

/**
 * Delete saved progress after resuming or completing
 * @param {string} topicId - Topic ID
 * @returns {object} - Result
 */
function deleteSavedQuizProgress(topicId) {
  try {
    Logger.log("=== DELETE SAVED QUIZ PROGRESS ===");

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "Not logged in" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "No personal sheet" };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");

    if (!quizSheet) {
      return { success: false, message: "No Quiz_Results sheet" };
    }

    const data = quizSheet.getDataRange().getValues();
    const headers = data[0];

    const topicIdCol = headers.indexOf("topicId");
    const statusCol = headers.indexOf("status");

    // Find and delete partial progress rows (from bottom to top to avoid index issues)
    let deletedCount = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][topicIdCol] === topicId && data[i][statusCol] === "partial") {
        quizSheet.deleteRow(i + 1);
        deletedCount++;
        Logger.log("Deleted row " + (i + 1));
      }
    }

    Logger.log("✅ Deleted " + deletedCount + " partial progress entries");
    return { success: true, deletedCount: deletedCount };
  } catch (error) {
    Logger.log("❌ Error deleting saved progress: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Save wrong answer to user's PERSONAL Google Sheet for later review
 * @param {object} wrongData - Wrong answer data
 * @returns {object} - {success, message}
 */
function saveWrongAnswer(wrongData) {
  try {
    Logger.log("=== SAVE WRONG ANSWER TO PERSONAL SHEET ===");
    Logger.log("Wrong data: " + JSON.stringify(wrongData));

    // Get current user email
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      Logger.log("⚠️ No user email, cannot save to personal sheet");
      return { success: false, message: "User not logged in" };
    }

    // Get user's personal sheet ID
    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      Logger.log("⚠️ User doesn't have personal sheet");
      return { success: false, message: "User personal sheet not found" };
    }
    Logger.log("Personal sheet ID: " + progressSheetId);

    // Open user's personal spreadsheet
    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const wrongSheet = getOrCreateWrongAnswersSheet(userSpreadsheet);

    // Check if this question already exists
    const data = wrongSheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const retryCountCol = headers.indexOf("retryCount");
    const lastRetryCol = headers.indexOf("lastRetry");

    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (
        data[i][topicIdCol] === wrongData.topicId &&
        data[i][questionIdCol] === wrongData.questionId
      ) {
        existingRow = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }

    if (existingRow > 0) {
      // Update retry count
      const currentRetryCount =
        wrongSheet.getRange(existingRow, retryCountCol + 1).getValue() || 0;
      wrongSheet
        .getRange(existingRow, retryCountCol + 1)
        .setValue(currentRetryCount + 1);
      wrongSheet
        .getRange(existingRow, lastRetryCol + 1)
        .setValue(new Date().toISOString());
      Logger.log("✅ Updated existing wrong answer entry");
    } else {
      // Create new entry (không cần userEmail vì đã là sheet cá nhân)
      const wrongEntry = [
        "WA_" + Date.now(), // id
        wrongData.topicId, // topicId
        wrongData.questionId, // questionId
        wrongData.question, // question
        wrongData.selectedAnswer, // selectedAnswer
        wrongData.correctAnswer, // correctAnswer
        1, // retryCount
        new Date().toISOString(), // lastRetry
        false, // mastered
        new Date().toISOString(), // createdAt
      ];
      wrongSheet.appendRow(wrongEntry);
      Logger.log("✅ New wrong answer saved to PERSONAL sheet");
    }

    return { success: true, message: "Wrong answer saved to personal sheet" };
  } catch (error) {
    Logger.log("❌ Error saving wrong answer: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get wrong answers for a topic from user's PERSONAL sheet to retry
 * @param {string} topicId - Topic ID
 * @returns {Array} - Array of wrong answer questions
 */
function getWrongAnswersForTopic(topicId) {
  try {
    Logger.log("=== GET WRONG ANSWERS FOR TOPIC FROM PERSONAL SHEET ===");
    Logger.log("Topic ID: " + topicId);

    // Get current user email
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      Logger.log("⚠️ No user email");
      return [];
    }

    // Get user's personal sheet ID
    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      Logger.log("⚠️ User doesn't have personal sheet");
      return [];
    }

    // Open user's personal spreadsheet
    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const wrongSheet = userSpreadsheet.getSheetByName("Wrong_Answers");

    if (!wrongSheet) {
      Logger.log("Wrong_Answers sheet not found in personal sheet");
      return [];
    }

    const data = wrongSheet.getDataRange().getValues();
    const headers = data[0];

    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const questionCol = headers.indexOf("question");
    const masteredCol = headers.indexOf("mastered");
    const retryCountCol = headers.indexOf("retryCount");

    const wrongAnswers = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === topicId && data[i][masteredCol] !== true) {
        wrongAnswers.push({
          questionId: data[i][questionIdCol],
          question: data[i][questionCol],
          retryCount: data[i][retryCountCol] || 0,
        });
      }
    }

    Logger.log("✅ Found " + wrongAnswers.length + " wrong answers to retry");
    return wrongAnswers;
  } catch (error) {
    Logger.log("❌ Error getting wrong answers: " + error.toString());
    return [];
  }
}

/**
 * Mark a question as mastered in user's PERSONAL sheet
 * @param {string} topicId - Topic ID
 * @param {string} questionId - Question ID
 * @returns {object} - {success, message}
 */
function markQuestionMastered(topicId, questionId) {
  try {
    Logger.log("=== MARK QUESTION MASTERED IN PERSONAL SHEET ===");

    // Get current user email
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "User not logged in" };
    }

    // Get user's personal sheet ID
    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "User personal sheet not found" };
    }

    // Open user's personal spreadsheet
    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const wrongSheet = userSpreadsheet.getSheetByName("Wrong_Answers");

    if (!wrongSheet) {
      return { success: false, message: "Wrong_Answers sheet not found" };
    }

    const data = wrongSheet.getDataRange().getValues();
    const headers = data[0];

    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const masteredCol = headers.indexOf("mastered");

    for (let i = 1; i < data.length; i++) {
      if (
        data[i][topicIdCol] === topicId &&
        data[i][questionIdCol] === questionId
      ) {
        wrongSheet.getRange(i + 1, masteredCol + 1).setValue(true);
        Logger.log("✅ Question marked as mastered in PERSONAL sheet");
        return { success: true, message: "Question mastered" };
      }
    }

    return { success: false, message: "Question not found" };
  } catch (error) {
    Logger.log("❌ Error marking mastered: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Save correct answer (mastered question) to user's personal sheet
 * @param {object} masteredData - {topicId, questionId, question}
 * @returns {object} - Result
 */
function saveMasteredQuestion(masteredData) {
  try {
    Logger.log("=== SAVE MASTERED QUESTION ===");

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "Not logged in" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "No personal sheet" };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    let masteredSheet = userSpreadsheet.getSheetByName("Mastered_Questions");

    // Create sheet if not exists
    if (!masteredSheet) {
      Logger.log("Creating Mastered_Questions sheet...");
      masteredSheet = userSpreadsheet.insertSheet("Mastered_Questions");
      masteredSheet.appendRow([
        "id",
        "topicId",
        "questionId",
        "question",
        "masteredAt",
        "timesCorrect",
      ]);

      const headerRange = masteredSheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#10b981");
      headerRange.setFontColor("white");
      masteredSheet.setFrozenRows(1);
    }

    // Check if already mastered
    const data = masteredSheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const timesCorrectCol = headers.indexOf("timesCorrect");

    for (let i = 1; i < data.length; i++) {
      if (
        data[i][topicIdCol] === masteredData.topicId &&
        data[i][questionIdCol] === masteredData.questionId
      ) {
        // Already mastered, increment counter
        const currentCount = data[i][timesCorrectCol] || 1;
        masteredSheet
          .getRange(i + 1, timesCorrectCol + 1)
          .setValue(currentCount + 1);
        Logger.log("✅ Updated existing mastered question");
        return { success: true, message: "Updated mastered count" };
      }
    }

    // Add new mastered question
    masteredSheet.appendRow([
      "MQ_" + Date.now(),
      masteredData.topicId,
      masteredData.questionId,
      masteredData.question,
      new Date().toISOString(),
      1,
    ]);

    // Also remove from Wrong_Answers if exists
    markQuestionMastered(masteredData.topicId, masteredData.questionId);

    Logger.log("✅ Saved new mastered question");
    return { success: true, message: "Question mastered" };
  } catch (error) {
    Logger.log("❌ Error saving mastered question: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get mastered question IDs for a topic
 * @param {string} topicId - Topic ID
 * @returns {Array} - Array of mastered questionIds
 */
function getMasteredQuestionIds(topicId) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return [];
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return [];
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const masteredSheet = userSpreadsheet.getSheetByName("Mastered_Questions");

    if (!masteredSheet) {
      return [];
    }

    const data = masteredSheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");

    const masteredIds = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === topicId) {
        masteredIds.push(data[i][questionIdCol]);
      }
    }

    Logger.log(
      "✅ Found " +
        masteredIds.length +
        " mastered questions for topic " +
        topicId,
    );
    return masteredIds;
  } catch (error) {
    Logger.log("❌ Error getting mastered questions: " + error.toString());
    return [];
  }
}

// ========== FLASHCARD PROGRESS MANAGEMENT ==========

/**
 * Save flashcard learning progress to user's personal sheet
 * @param {string} progressDataJson - JSON string of progress data
 */
function saveFlashcardProgress(progressDataJson) {
  try {
    Logger.log("=== SAVE FLASHCARD PROGRESS ===");

    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !currentUser.userId) {
      Logger.log("❌ User not logged in");
      return { success: false, message: "User not logged in" };
    }

    Logger.log("User ID: " + currentUser.userId);

    let progressData;
    try {
      progressData = JSON.parse(progressDataJson);
    } catch (e) {
      return { success: false, message: "Invalid progress data format" };
    }

    Logger.log("Saving progress for topic: " + progressData.topicId);
    Logger.log(
      "Learned: " +
        progressData.learnedCount +
        ", Review: " +
        progressData.reviewCount,
    );

    // Get or CREATE user spreadsheet if not exists
    let spreadsheet = getUserSpreadsheet(currentUser.userId);
    if (!spreadsheet) {
      Logger.log("⚠️ User spreadsheet not found, creating new one...");
      try {
        const newSheetId = createUserPersonalSheet(
          currentUser.userId,
          currentUser.username || currentUser.email,
        );
        if (newSheetId) {
          spreadsheet = SpreadsheetApp.openById(newSheetId);
          Logger.log("✅ Created new user spreadsheet: " + newSheetId);
        }
      } catch (createError) {
        Logger.log(
          "❌ Failed to create user spreadsheet: " + createError.toString(),
        );
        return { success: false, message: "Cannot create user spreadsheet" };
      }
    }

    if (!spreadsheet) {
      return { success: false, message: "User spreadsheet not found" };
    }

    Logger.log("📁 Using spreadsheet: " + spreadsheet.getName());

    // Ensure FlashcardSessions sheet exists
    let sessionsSheet = spreadsheet.getSheetByName("FlashcardSessions");
    if (!sessionsSheet) {
      sessionsSheet = spreadsheet.insertSheet("FlashcardSessions");
      sessionsSheet
        .getRange(1, 1, 1, 8)
        .setValues([
          [
            "sessionId",
            "topicId",
            "totalCards",
            "learnedCount",
            "reviewCount",
            "resultsJson",
            "completedAt",
            "createdAt",
          ],
        ]);
      sessionsSheet
        .getRange(1, 1, 1, 8)
        .setFontWeight("bold")
        .setBackground("#4285f4")
        .setFontColor("white");
    }

    // Generate session ID
    const sessionId =
      "FCS_" +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 6);

    // Save session
    sessionsSheet.appendRow([
      sessionId,
      progressData.topicId,
      progressData.totalCards,
      progressData.learnedCount,
      progressData.reviewCount,
      JSON.stringify(progressData.results),
      progressData.completedAt,
      new Date().toISOString(),
    ]);

    // Also update individual card progress
    saveIndividualCardProgress(spreadsheet, progressData);

    Logger.log("✅ Flashcard progress saved: " + sessionId);
    return {
      success: true,
      sessionId: sessionId,
      message: "Progress saved successfully",
    };
  } catch (error) {
    Logger.log("❌ Error saving flashcard progress: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Save individual card progress for spaced repetition
 */
function saveIndividualCardProgress(spreadsheet, progressData) {
  try {
    // Ensure CardProgress sheet exists
    let cardSheet = spreadsheet.getSheetByName("CardProgress");
    if (!cardSheet) {
      cardSheet = spreadsheet.insertSheet("CardProgress");
      cardSheet
        .getRange(1, 1, 1, 7)
        .setValues([
          [
            "cardId",
            "topicId",
            "status",
            "timesReviewed",
            "timesCorrect",
            "lastReviewed",
            "nextReview",
          ],
        ]);
      cardSheet
        .getRange(1, 1, 1, 7)
        .setFontWeight("bold")
        .setBackground("#34a853")
        .setFontColor("white");
    }

    const data = cardSheet.getDataRange().getValues();
    const existingCards = {};

    // Build map of existing cards
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0] + "_" + data[i][1]; // cardId_topicId
      existingCards[key] = i + 1; // row number (1-based)
    }

    const now = new Date();

    // Process each card result
    progressData.results.forEach((result) => {
      const key = result.cardId + "_" + progressData.topicId;
      const isCorrect = result.status === "learned";

      if (existingCards[key]) {
        // Update existing row
        const rowNum = existingCards[key];
        const currentData = cardSheet.getRange(rowNum, 1, 1, 7).getValues()[0];

        const timesReviewed = (currentData[3] || 0) + 1;
        const timesCorrect = (currentData[4] || 0) + (isCorrect ? 1 : 0);
        const nextReview = calculateNextReviewDate(timesCorrect, isCorrect);

        cardSheet
          .getRange(rowNum, 3, 1, 5)
          .setValues([
            [result.status, timesReviewed, timesCorrect, now, nextReview],
          ]);
      } else {
        // Add new row
        const nextReview = calculateNextReviewDate(0, isCorrect);
        cardSheet.appendRow([
          result.cardId,
          progressData.topicId,
          result.status,
          1,
          isCorrect ? 1 : 0,
          now,
          nextReview,
        ]);
      }
    });
  } catch (error) {
    Logger.log("Error saving individual card progress: " + error.toString());
  }
}

/**
 * Calculate next review date based on spaced repetition
 */
function calculateNextReviewDate(timesCorrect, wasCorrect) {
  const now = new Date();
  let daysToAdd = 1;

  if (wasCorrect) {
    // Spaced repetition intervals: 1, 3, 7, 14, 30 days
    const intervals = [1, 3, 7, 14, 30, 60];
    daysToAdd = intervals[Math.min(timesCorrect, intervals.length - 1)];
  }

  now.setDate(now.getDate() + daysToAdd);
  return now;
}

/**
 * Get flashcard progress for a specific topic
 * @param {string} topicId - Topic ID
 */
function getFlashcardProgress(topicId) {
  try {
    Logger.log("=== GET FLASHCARD PROGRESS ===");
    Logger.log("Topic ID: " + topicId);

    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !currentUser.userId) {
      return { success: false, message: "User not logged in" };
    }

    const spreadsheet = getUserSpreadsheet(currentUser.userId);
    if (!spreadsheet) {
      return { success: false, data: null, message: "No progress found" };
    }

    // Get latest session for this topic
    const sessionsSheet = spreadsheet.getSheetByName("FlashcardSessions");
    if (!sessionsSheet) {
      return { success: false, data: null, message: "No sessions found" };
    }

    const data = sessionsSheet.getDataRange().getValues();
    let latestSession = null;

    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][1] === topicId) {
        latestSession = {
          sessionId: data[i][0],
          topicId: data[i][1],
          totalCards: data[i][2],
          learnedCount: data[i][3],
          reviewCount: data[i][4],
          results: JSON.parse(data[i][5] || "[]"),
          completedAt: data[i][6],
        };
        break;
      }
    }

    if (latestSession) {
      Logger.log("✅ Found progress: " + JSON.stringify(latestSession));
      return {
        success: true,
        data: JSON.stringify(latestSession),
        message: "Progress loaded",
      };
    }

    return {
      success: false,
      data: null,
      message: "No progress found for this topic",
    };
  } catch (error) {
    Logger.log("❌ Error getting flashcard progress: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get cards that need review (due for spaced repetition)
 * @param {string} topicId - Topic ID
 */
function getCardsForReview(topicId) {
  try {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !currentUser.userId) {
      return { success: false, message: "User not logged in" };
    }

    const spreadsheet = getUserSpreadsheet(currentUser.userId);
    if (!spreadsheet) {
      return { success: false, data: [], message: "No cards found" };
    }

    const cardSheet = spreadsheet.getSheetByName("CardProgress");
    if (!cardSheet) {
      return { success: false, data: [], message: "No card progress found" };
    }

    const data = cardSheet.getDataRange().getValues();
    const now = new Date();
    const cardsForReview = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === topicId) {
        const nextReview = new Date(data[i][6]);
        const status = data[i][2];

        // Include cards that are due for review or marked as "review"
        if (status === "review" || nextReview <= now) {
          cardsForReview.push({
            cardId: data[i][0],
            status: status,
            timesReviewed: data[i][3],
            timesCorrect: data[i][4],
          });
        }
      }
    }

    return {
      success: true,
      data: JSON.stringify(cardsForReview),
      count: cardsForReview.length,
    };
  } catch (error) {
    Logger.log("❌ Error getting cards for review: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ========== LEARNING PROGRESS API ==========

/**
 * Lưu tiến trình học tập của user
 * @param {string} topicId - ID của topic
 * @param {string} progressType - 'lesson', 'mindmap', 'flashcards'
 * @param {Object} progressData - Dữ liệu tiến trình
 * @returns {Object} - {success, message}
 */
function saveLearningProgressForWeb(topicId, progressType, progressData) {
  Logger.log("📚 saveLearningProgressForWeb CALLED");
  Logger.log("Args: topicId=" + topicId + ", type=" + progressType);
  Logger.log("Data: " + JSON.stringify(progressData));

  try {
    // Lấy thông tin user hiện tại
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "User not authenticated" };
    }

    // Lấy userId từ email
    const userId = getUserIdByEmail(userEmail);
    if (!userId) {
      return { success: false, message: "User not found" };
    }

    // Lấy hoặc tạo session cho topic này
    let session = AILearningSessions.getLastSession(userId, topicId);
    let sessionId;

    if (!session || session.completedAt) {
      // Tạo session mới nếu chưa có hoặc session cũ đã hoàn thành
      sessionId = AILearningSessions.start(userId, topicId);
    } else {
      sessionId = session.sessionId;
    }

    // Update session dựa trên loại tiến trình
    const updateData = {};

    switch (progressType) {
      case "lesson":
        updateData.lessonViewed = 1;
        if (progressData.scrollDepth) {
          updateData.scrollDepth = progressData.scrollDepth;
        }
        if (progressData.completed) {
          updateData.completedAt = new Date();
        }
        break;

      case "mindmap":
        updateData.mindmapViewed = 1;
        break;

      case "flashcards":
        if (progressData.total) {
          updateData.flashcardsTotal = progressData.total;
        }
        if (progressData.reviewed) {
          updateData.flashcardsReviewed = progressData.reviewed;
        }
        // Nếu đã xem hết flashcards
        if (progressData.completed) {
          updateData.completedAt = new Date();
        }
        break;
    }

    // Cập nhật session
    AILearningSessions.update(userId, sessionId, updateData);

    // Cập nhật Topic_Progress
    updateTopicProgress(userId, topicId, progressType, progressData);

    Logger.log("✅ Learning progress saved successfully");
    return {
      success: true,
      message: "Progress saved",
      sessionId: sessionId,
    };
  } catch (error) {
    Logger.log("❌ Error saving learning progress: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Update Topic_Progress sheet
 */
function updateTopicProgress(userId, topicId, progressType, progressData) {
  try {
    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) return;

    let sheet = spreadsheet.getSheetByName("Topic_Progress");

    // Tạo sheet nếu chưa có
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Topic_Progress");
      const headers = [
        "progressId",
        "topicId",
        "topicTitle",
        "lessonCompleted",
        "mindmapViewed",
        "flashcardsCompleted",
        "quizDone",
        "matchingDone",
        "challengeDone",
        "attempts",
        "accuracy",
        "bestScore",
        "xpEarned",
        "status",
        "unlockedAt",
        "completedAt",
        "lastUpdated",
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Tìm row cho topic này
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("topicId")] === topicId) {
        rowIndex = i + 1; // +1 vì 1-indexed
        break;
      }
    }

    const now = new Date();

    if (rowIndex === -1) {
      // Tạo row mới
      const progressId = "PRG_" + Date.now().toString(36);
      const newRow = new Array(headers.length).fill("");
      newRow[headers.indexOf("progressId")] = progressId;
      newRow[headers.indexOf("topicId")] = topicId;
      newRow[headers.indexOf("topicTitle")] = progressData.topicTitle || "";
      newRow[headers.indexOf("status")] = "in_progress";
      newRow[headers.indexOf("unlockedAt")] = now;
      newRow[headers.indexOf("lastUpdated")] = now;

      // Set theo loại
      if (progressType === "lesson") {
        newRow[headers.indexOf("lessonCompleted")] = progressData.completed
          ? 1
          : 0;
      } else if (progressType === "mindmap") {
        newRow[headers.indexOf("mindmapViewed")] = 1;
      } else if (progressType === "flashcards") {
        newRow[headers.indexOf("flashcardsCompleted")] = progressData.completed
          ? 1
          : 0;
      }

      sheet.appendRow(newRow);
    } else {
      // Update row hiện có
      if (progressType === "lesson" && progressData.completed) {
        const colIdx = headers.indexOf("lessonCompleted");
        if (colIdx >= 0) sheet.getRange(rowIndex, colIdx + 1).setValue(1);
      }
      if (progressType === "mindmap") {
        const colIdx = headers.indexOf("mindmapViewed");
        if (colIdx >= 0) sheet.getRange(rowIndex, colIdx + 1).setValue(1);
      }
      if (progressType === "flashcards" && progressData.completed) {
        const colIdx = headers.indexOf("flashcardsCompleted");
        if (colIdx >= 0) sheet.getRange(rowIndex, colIdx + 1).setValue(1);
      }

      // Update lastUpdated
      const lastUpdatedCol = headers.indexOf("lastUpdated");
      if (lastUpdatedCol >= 0)
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);

      // Check if all completed -> update status
      const lessonCol = headers.indexOf("lessonCompleted");
      const mindmapCol = headers.indexOf("mindmapViewed");
      const flashcardsCol = headers.indexOf("flashcardsCompleted");

      const currentData = sheet
        .getRange(rowIndex, 1, 1, headers.length)
        .getValues()[0];
      const lessonDone = currentData[lessonCol] === 1;
      const mindmapDone = currentData[mindmapCol] === 1;
      const flashcardsDone = currentData[flashcardsCol] === 1;

      if (lessonDone && mindmapDone && flashcardsDone) {
        const statusCol = headers.indexOf("status");
        const completedAtCol = headers.indexOf("completedAt");
        if (statusCol >= 0)
          sheet.getRange(rowIndex, statusCol + 1).setValue("completed");
        if (completedAtCol >= 0)
          sheet.getRange(rowIndex, completedAtCol + 1).setValue(now);
      }
    }

    Logger.log("✅ Topic progress updated for: " + topicId);
  } catch (error) {
    Logger.log("❌ Error updating topic progress: " + error.toString());
  }
}

/**
 * Lấy tiến trình học tập của user cho tất cả topics
 * @returns {Object} - {success, data: {topicId: progressData}}
 */
function getLearningProgressForWeb() {
  Logger.log("📊 getLearningProgressForWeb CALLED");

  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return { success: false, message: "User not authenticated", data: {} };
    }

    const userId = getUserIdByEmail(userEmail);
    if (!userId) {
      return { success: false, message: "User not found", data: {} };
    }

    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) {
      return { success: true, data: {} }; // No data yet
    }

    const sheet = spreadsheet.getSheetByName("Topic_Progress");
    if (!sheet) {
      return { success: true, data: {} }; // No progress yet
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const progressMap = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const topicId = row[headers.indexOf("topicId")];

      if (topicId) {
        progressMap[topicId] = {
          lessonCompleted: row[headers.indexOf("lessonCompleted")] === 1,
          mindmapViewed: row[headers.indexOf("mindmapViewed")] === 1,
          flashcardsCompleted:
            row[headers.indexOf("flashcardsCompleted")] === 1,
          quizDone: row[headers.indexOf("quizDone")] === 1,
          status: row[headers.indexOf("status")] || "not_started",
          completedAt: row[headers.indexOf("completedAt")] || null,
          // Tính progress %
          progress: calculateProgressPercent(row, headers),
        };
      }
    }

    Logger.log(
      "✅ Loaded progress for " + Object.keys(progressMap).length + " topics",
    );
    return { success: true, data: progressMap };
  } catch (error) {
    Logger.log("❌ Error getting learning progress: " + error.toString());
    return { success: false, message: error.toString(), data: {} };
  }
}

/**
 * Calculate progress percentage
 */
function calculateProgressPercent(row, headers) {
  let completed = 0;
  const total = 4; // lesson, mindmap, flashcards, quiz

  if (row[headers.indexOf("lessonCompleted")] === 1) completed++;
  if (row[headers.indexOf("mindmapViewed")] === 1) completed++;
  if (row[headers.indexOf("flashcardsCompleted")] === 1) completed++;
  if (row[headers.indexOf("quizDone")] === 1) completed++;

  return Math.round((completed / total) * 100);
}

/**
 * Helper: Get userId by email
 */
function getUserIdByEmail(email) {
  try {
    const masterDb = SpreadsheetApp.openById(MASTER_DB_ID);
    const usersSheet = masterDb.getSheetByName("Users");
    if (!usersSheet) return null;

    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        // email is column B (index 1)
        return data[i][0]; // userId is column A (index 0)
      }
    }
    return null;
  } catch (error) {
    Logger.log("Error getting userId: " + error.toString());
    return null;
  }
}

/**
 * Helper: Get user spreadsheet
 */
function getUserSpreadsheet(userId) {
  try {
    const masterDb = SpreadsheetApp.openById(MASTER_DB_ID);
    const usersSheet = masterDb.getSheetByName("Users");
    if (!usersSheet) return null;

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const progressSheetIdCol = headers.indexOf("progressSheetId");

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        const sheetId = data[i][progressSheetIdCol];
        if (sheetId) {
          return SpreadsheetApp.openById(sheetId);
        }
      }
    }
    return null;
  } catch (error) {
    Logger.log("Error getting user spreadsheet: " + error.toString());
    return null;
  }
}
