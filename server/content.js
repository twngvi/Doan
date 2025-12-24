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
        Object.keys(response).join(", ")
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
      forceRegenerate
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
              "📤 Returning result with data length: " + dataString.length
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
      "✅ Document analyzed: " + (analysis.mainTopic || "Unknown topic")
    );

    // 4. Generate content using AI (với đầy đủ tham số)
    let generatedContent;

    switch (contentType) {
      case "mindmap":
        generatedContent = ContentGenerator.generateMindmap(
          docResult.content,
          analysis
        );
        break;
      case "flashcards":
        generatedContent = ContentGenerator.generateFlashcards(
          docResult.content,
          analysis
        );
        break;
      case "lesson_summary":
        generatedContent = ContentGenerator.generateLessonSummary(
          docResult.content,
          analysis
        );
        break;
      case "infographic":
        generatedContent = ContentGenerator.generateInfographic(
          docResult.content,
          analysis
        );
        break;
      case "questions":
        // Sửa tên hàm: generateMCQQuestions -> generateQuestions
        generatedContent = ContentGenerator.generateQuestions(
          docResult.content,
          analysis,
          { questionCount: 20 }
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
 * Save quiz result to User_Progress sheet
 * @param {object} resultData - Quiz result data
 * @returns {object} - {success, message}
 */
function saveQuizResult(resultData) {
  try {
    Logger.log("=== SAVE QUIZ RESULT ===");
    Logger.log("Result data: " + JSON.stringify(resultData));

    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    let progressSheet = ss.getSheetByName("User_Progress");

    // Create sheet if not exists
    if (!progressSheet) {
      Logger.log("Creating User_Progress sheet...");
      progressSheet = ss.insertSheet("User_Progress");
      progressSheet.appendRow([
        "userEmail",
        "topicId",
        "topicTitle",
        "activityType",
        "score",
        "totalQuestions",
        "percentage",
        "timeTaken",
        "completedAt",
        "answers",
      ]);
    }

    // Get current user
    const userEmail = Session.getActiveUser().getEmail() || "anonymous";
    Logger.log("User email: " + userEmail);

    // Create progress entry
    const progressEntry = [
      userEmail,
      resultData.topicId,
      resultData.topicTitle,
      "quiz",
      resultData.score,
      resultData.totalQuestions,
      resultData.percentage,
      resultData.timeTaken,
      new Date().toISOString(),
      JSON.stringify(resultData.answers),
    ];

    // Append to sheet
    progressSheet.appendRow(progressEntry);

    Logger.log("✅ Quiz result saved successfully");

    return {
      success: true,
      message: "Quiz result saved",
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
 * Save wrong answer for later review with different question format
 * @param {object} wrongData - Wrong answer data
 * @returns {object} - {success, message}
 */
function saveWrongAnswer(wrongData) {
  try {
    Logger.log("=== SAVE WRONG ANSWER ===");
    Logger.log("Wrong data: " + JSON.stringify(wrongData));

    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    let wrongSheet = ss.getSheetByName("Wrong_Answers");

    // Create sheet if not exists
    if (!wrongSheet) {
      Logger.log("Creating Wrong_Answers sheet...");
      wrongSheet = ss.insertSheet("Wrong_Answers");
      wrongSheet.appendRow([
        "id",
        "userEmail",
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
    }

    const userEmail = Session.getActiveUser().getEmail() || "anonymous";

    // Check if this question already exists for this user
    const data = wrongSheet.getDataRange().getValues();
    const headers = data[0];
    const userEmailCol = headers.indexOf("userEmail");
    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const retryCountCol = headers.indexOf("retryCount");
    const lastRetryCol = headers.indexOf("lastRetry");

    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (
        data[i][userEmailCol] === userEmail &&
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
      // Create new entry
      const wrongEntry = [
        "WA" + Date.now(),
        userEmail,
        wrongData.topicId,
        wrongData.questionId,
        wrongData.question,
        wrongData.selectedAnswer,
        wrongData.correctAnswer,
        1, // retryCount
        new Date().toISOString(), // lastRetry
        false, // mastered
        new Date().toISOString(), // createdAt
      ];
      wrongSheet.appendRow(wrongEntry);
      Logger.log("✅ New wrong answer saved");
    }

    return { success: true, message: "Wrong answer saved" };
  } catch (error) {
    Logger.log("❌ Error saving wrong answer: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get wrong answers for a topic to retry
 * @param {string} topicId - Topic ID
 * @returns {Array} - Array of wrong answer questions
 */
function getWrongAnswersForTopic(topicId) {
  try {
    Logger.log("=== GET WRONG ANSWERS FOR TOPIC ===");
    Logger.log("Topic ID: " + topicId);

    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    const wrongSheet = ss.getSheetByName("Wrong_Answers");

    if (!wrongSheet) {
      Logger.log("Wrong_Answers sheet not found");
      return [];
    }

    const userEmail = Session.getActiveUser().getEmail() || "anonymous";
    const data = wrongSheet.getDataRange().getValues();
    const headers = data[0];

    const userEmailCol = headers.indexOf("userEmail");
    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const questionCol = headers.indexOf("question");
    const masteredCol = headers.indexOf("mastered");
    const retryCountCol = headers.indexOf("retryCount");

    const wrongAnswers = [];

    for (let i = 1; i < data.length; i++) {
      if (
        data[i][userEmailCol] === userEmail &&
        data[i][topicIdCol] === topicId &&
        data[i][masteredCol] !== true
      ) {
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
 * Mark a question as mastered (user answered correctly on retry)
 * @param {string} topicId - Topic ID
 * @param {string} questionId - Question ID
 * @returns {object} - {success, message}
 */
function markQuestionMastered(topicId, questionId) {
  try {
    Logger.log("=== MARK QUESTION MASTERED ===");

    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    const wrongSheet = ss.getSheetByName("Wrong_Answers");

    if (!wrongSheet) {
      return { success: false, message: "Sheet not found" };
    }

    const userEmail = Session.getActiveUser().getEmail() || "anonymous";
    const data = wrongSheet.getDataRange().getValues();
    const headers = data[0];

    const userEmailCol = headers.indexOf("userEmail");
    const topicIdCol = headers.indexOf("topicId");
    const questionIdCol = headers.indexOf("questionId");
    const masteredCol = headers.indexOf("mastered");

    for (let i = 1; i < data.length; i++) {
      if (
        data[i][userEmailCol] === userEmail &&
        data[i][topicIdCol] === topicId &&
        data[i][questionIdCol] === questionId
      ) {
        wrongSheet.getRange(i + 1, masteredCol + 1).setValue(true);
        Logger.log("✅ Question marked as mastered");
        return { success: true, message: "Question mastered" };
      }
    }

    return { success: false, message: "Question not found" };
  } catch (error) {
    Logger.log("❌ Error marking mastered: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
