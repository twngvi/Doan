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

    // 2.5 ⭐ Xóa CSS Google Doc phá bullet/numbering
    // Google Docs export thêm CSS: ul/ol { list-style-type: none } → mất bullet
    html = html.replace(/ul\s*\{[^}]*\}/gi, "");
    html = html.replace(/ol\s*\{[^}]*\}/gi, "");
    html = html.replace(/li\s*\{[^}]*\}/gi, "");
    // Xóa các class của Google Docs cho list (lst-kix_...)
    html = html.replace(/\.lst-[^{]*\{[^}]*\}/gi, "");
    // Xóa toàn bộ <style> block từ Google Doc (đã có CSS riêng)
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // 3. Extract body content
    html = extractBodyContent(html);

    // 4. ⭐ Format bullet & numbering characters
    html = formatBulletAndNumbering(html);

    // 5. Thêm class wrapper để style dễ hơn
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
      "mini_quiz",
      "matching",
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
      case "mini_quiz":
        generatedContent = ContentGenerator.generateMiniQuiz(
          docResult.content,
          analysis,
        );
        break;
      case "matching":
        generatedContent = ContentGenerator.generateMatchingPairs(
          docResult.content,
          analysis,
          { pairCount: 10, difficulty: "mixed" },
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

// ========== MATCHING PAIRS DATA LOADER ==========

/**
 * Load matching pairs cho Matching Game
 *
 * Flow:
 * 1. Kiểm tra cache AI_Content_Cache (contentType = "matching")
 * 2. Nếu không có -> gọi AI generate qua ContentGenerator.generateMatchingPairs
 * 3. Validate từng pair (phải có question + answer)
 * 4. Random lấy đúng pairLimit nếu dữ liệu nhiều hơn
 * 5. Trả về mảng pairs chuẩn hóa
 *
 * @param {string} topicId - Topic ID (e.g. "TOP001")
 * @param {number} pairLimit - Số cặp cần lấy (4/6/8)
 * @returns {Array} Mảng pairs: [{question, answer, hint, difficulty}]
 */
function getMatchingPairs(topicId, pairLimit) {
  Logger.log("🎮 getMatchingPairs CALLED");
  Logger.log("Args: topicId=" + topicId + ", pairLimit=" + pairLimit);

  // Defaults
  pairLimit = parseInt(pairLimit) || 6;

  try {
    // Validate input
    if (!topicId) {
      throw new Error("Thiếu topicId");
    }

    // 1. Check cache first
    Logger.log("🔍 Checking matching cache...");
    var cachedPairs = null;
    try {
      var cached = AIContentCache.get(topicId, "matching");
      if (cached && cached.content) {
        Logger.log("📦 Matching cache FOUND");
        var cacheData = cached.content;
        if (typeof cacheData === "string") {
          cacheData = JSON.parse(cacheData);
        }
        if (cacheData.pairs && Array.isArray(cacheData.pairs)) {
          cachedPairs = cacheData.pairs;
        }
      }
    } catch (cacheErr) {
      Logger.log("⚠️ Cache read error: " + cacheErr.toString());
    }

    // 2. Nếu không có cache -> generate bằng AI
    if (!cachedPairs || cachedPairs.length === 0) {
      Logger.log("🤖 No cache, generating matching pairs with AI...");

      // Get topic info để lấy contentDocId
      var topicInfo = getTopicInfo(topicId);
      if (!topicInfo || !topicInfo.contentDocId) {
        throw new Error(
          "Không tìm thấy tài liệu cho topic này. Vui lòng kiểm tra lại contentDocId.",
        );
      }

      // Read Google Doc
      var docResult = GeminiService.readGoogleDoc(topicInfo.contentDocId);
      if (!docResult.success) {
        throw new Error("Không thể đọc tài liệu: " + docResult.error);
      }

      // Analyze document
      Logger.log("🔍 Analyzing document for matching...");
      var analysis = ContentGenerator.analyzeDocument(docResult.content);
      if (!analysis || analysis.error) {
        throw new Error(
          "Lỗi phân tích tài liệu: " + (analysis ? analysis.error : "Unknown"),
        );
      }

      // Generate matching pairs (request nhiều hơn pairLimit để có đủ sau validate)
      var requestCount = Math.max(pairLimit + 2, 10);
      Logger.log("🎯 Requesting " + requestCount + " matching pairs...");

      var generated = ContentGenerator.generateMatchingPairs(
        docResult.content,
        analysis,
        { pairCount: requestCount, difficulty: "mixed" },
      );

      if (!generated || !generated.pairs || !Array.isArray(generated.pairs)) {
        throw new Error("AI không thể tạo matching pairs. Vui lòng thử lại.");
      }

      cachedPairs = generated.pairs;
      Logger.log("✅ AI generated " + cachedPairs.length + " pairs");

      // Save vào cache
      try {
        AIContentCache.save({
          topicId: topicId,
          contentDocId: topicInfo.contentDocId,
          contentType: "matching",
          generatedContent: generated,
          promptUsed: "MATCHING_GENERATION",
          geminiModel: AI_CONFIG.GEMINI_MODEL_DEFAULT,
          docLastModified: docResult.lastModified || new Date().toISOString(),
        });
        Logger.log("💾 Matching pairs cached");
      } catch (saveErr) {
        Logger.log("⚠️ Cache save failed: " + saveErr.toString());
      }
    }

    // 3. Validate từng pair
    Logger.log("🔍 Validating " + cachedPairs.length + " pairs...");
    var validPairs = [];
    for (var i = 0; i < cachedPairs.length; i++) {
      var pair = cachedPairs[i];
      if (
        pair &&
        pair.question &&
        pair.answer &&
        String(pair.question).trim() !== "" &&
        String(pair.answer).trim() !== ""
      ) {
        validPairs.push({
          question: String(pair.question).trim(),
          answer: String(pair.answer).trim(),
          hint: pair.hint ? String(pair.hint).trim() : "",
          difficulty: pair.difficulty || "medium",
        });
      }
    }

    Logger.log(
      "✅ Valid pairs: " + validPairs.length + "/" + cachedPairs.length,
    );

    // 4. Kiểm tra đủ số lượng
    if (validPairs.length < pairLimit) {
      throw new Error(
        "Không đủ dữ liệu matching. Cần " +
          pairLimit +
          " cặp nhưng chỉ có " +
          validPairs.length +
          " cặp hợp lệ. Vui lòng thử lại hoặc chọn độ khó thấp hơn.",
      );
    }

    // 5. Random lấy đúng pairLimit nếu nhiều hơn
    if (validPairs.length > pairLimit) {
      // Fisher-Yates shuffle
      for (var j = validPairs.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var temp = validPairs[j];
        validPairs[j] = validPairs[k];
        validPairs[k] = temp;
      }
      validPairs = validPairs.slice(0, pairLimit);
    }

    Logger.log("🎮 Returning " + validPairs.length + " matching pairs");
    return validPairs;
  } catch (error) {
    Logger.log("❌ getMatchingPairs error: " + error.toString());
    throw new Error(error.message || "Lỗi tải dữ liệu matching");
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

// ========== BULLET & NUMBERING FORMATTER ==========

/**
 * ⭐ Format text-based bullets & numbering in Google Doc HTML
 * Converts plain-text bullet/numbered paragraphs to proper <ul>/<ol> lists
 *
 * Handles:
 * - Bullet chars: •, ●, ○, ■, ▪, ▸, ▹, -, –, —, ★, ✓, ✔, ➤, ➜, →, ▶
 * - Numbered patterns: 1., 2., a., b., (1), (a), i., ii.
 * - Nested indentation via margin-left from Google Docs
 */
function formatBulletAndNumbering(html) {
  try {
    Logger.log("⭐ Formatting bullet & numbering...");

    // === PHASE 1: Text-based bullet characters → <ul> ===
    // Match <p> tags whose visible text starts with a bullet character
    var bulletChars = "•●○■▪▸▹►▻★☆✓✔✗✘➤➜➡→▶◆◇⦿⁃";
    var dashChars = ["-", "–", "—"]; // dash bullets (must be followed by space)

    // Build a regex that captures: <p ...> [optional spans/tags] BULLET_CHAR rest </p>
    // We process line-by-line to group consecutive bullet paragraphs
    var lines = html.split(/(?=<p[\s>])/i);
    var result = [];
    var bulletBuffer = [];
    var numberBuffer = [];
    var lastBulletIndent = 0;
    var lastNumberIndent = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Extract plain text content from this line
      var textContent = line
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim();

      // Detect indentation level from margin-left
      var indentMatch = line.match(
        /margin-left\s*:\s*([\d.]+)\s*(px|pt|rem|em)/i,
      );
      var indentLevel = 0;
      if (indentMatch) {
        var indentVal = parseFloat(indentMatch[1]);
        var unit = indentMatch[2].toLowerCase();
        // Normalize to approximate nesting level
        if (unit === "pt") indentVal = indentVal * 1.333; // pt to px approx
        if (unit === "rem" || unit === "em") indentVal = indentVal * 16;
        indentLevel = Math.floor(indentVal / 36); // ~36px per indent level
      }

      // --- Check for BULLET pattern ---
      var isBullet = false;
      var bulletContent = "";

      // Check bullet Unicode characters
      if (
        textContent.length > 0 &&
        bulletChars.indexOf(textContent.charAt(0)) !== -1
      ) {
        isBullet = true;
        bulletContent = textContent.substring(1).trim();
      }
      // Check dash bullets (- text, – text, — text) - must have space after
      if (!isBullet) {
        for (var d = 0; d < dashChars.length; d++) {
          if (textContent.indexOf(dashChars[d] + " ") === 0) {
            isBullet = true;
            bulletContent = textContent.substring(dashChars[d].length).trim();
            break;
          }
        }
      }

      // --- Check for NUMBERING pattern ---
      var isNumbered = false;
      var numberContent = "";
      var numberMatch = textContent.match(
        /^(?:(\d{1,3})\.\s|\((\d{1,3})\)\s|([a-zA-Z])\.\s|\(([a-zA-Z])\)\s|([ivxlIVXL]{1,4})\.\s|\(([ivxlIVXL]{1,4})\)\s)(.*)/,
      );
      if (numberMatch && !isBullet) {
        isNumbered = true;
        numberContent = numberMatch[7] || "";
      }

      // --- Build list buffers ---
      if (isBullet) {
        // Flush number buffer if any
        if (numberBuffer.length > 0) {
          result.push(buildListHtml(numberBuffer, "ol"));
          numberBuffer = [];
        }
        // Get the rich HTML content (preserve bold, italic, links, etc.)
        var richContent = extractParagraphInnerContent(
          line,
          bulletChars,
          dashChars,
        );
        bulletBuffer.push({ content: richContent, indent: indentLevel });
      } else if (isNumbered) {
        // Flush bullet buffer if any
        if (bulletBuffer.length > 0) {
          result.push(buildListHtml(bulletBuffer, "ul"));
          bulletBuffer = [];
        }
        var richContent = extractParagraphInnerContentForNumber(line);
        numberBuffer.push({ content: richContent, indent: indentLevel });
      } else {
        // Not a list item - flush all buffers
        if (bulletBuffer.length > 0) {
          result.push(buildListHtml(bulletBuffer, "ul"));
          bulletBuffer = [];
        }
        if (numberBuffer.length > 0) {
          result.push(buildListHtml(numberBuffer, "ol"));
          numberBuffer = [];
        }
        result.push(line);
      }
    }

    // Flush remaining buffers
    if (bulletBuffer.length > 0) {
      result.push(buildListHtml(bulletBuffer, "ul"));
    }
    if (numberBuffer.length > 0) {
      result.push(buildListHtml(numberBuffer, "ol"));
    }

    var finalHtml = result.join("");
    Logger.log("✅ Bullet & numbering formatted");
    return finalHtml;
  } catch (error) {
    Logger.log("⚠️ Error in formatBulletAndNumbering: " + error.toString());
    return html; // Return original on error
  }
}

/**
 * Extract inner HTML content from a <p> tag, removing the leading bullet character
 */
function extractParagraphInnerContent(pHtml, bulletChars, dashChars) {
  // Get content inside <p...>...</p>
  var innerMatch = pHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!innerMatch) return pHtml.replace(/<[^>]*>/g, "").trim();

  var inner = innerMatch[1];

  // Remove leading bullet character (may be inside nested spans)
  // Strategy: strip the first visible text character if it's a bullet
  var cleaned = inner.replace(
    /^(\s*(?:<[^>]*>\s*)*)([•●○■▪▸▹►▻★☆✓✔✗✘➤➜➡→▶◆◇⦿⁃])\s*/,
    function (match, prefix, bullet) {
      return prefix;
    },
  );

  // Also handle dash bullets at start
  if (cleaned === inner) {
    cleaned = inner.replace(
      /^(\s*(?:<[^>]*>\s*)*)([\-–—])\s+/,
      function (match, prefix, dash) {
        return prefix;
      },
    );
  }

  // Clean up: remove empty leading spans
  cleaned = cleaned.replace(/^\s*<span[^>]*>\s*<\/span>\s*/, "").trim();

  return cleaned || inner.trim();
}

/**
 * Extract inner HTML content for numbered list, removing the leading number/letter
 */
function extractParagraphInnerContentForNumber(pHtml) {
  var innerMatch = pHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!innerMatch) return pHtml.replace(/<[^>]*>/g, "").trim();

  var inner = innerMatch[1];

  // Remove leading number pattern (1. or (1) or a. or (a) or i. etc.)
  var cleaned = inner.replace(
    /^(\s*(?:<[^>]*>\s*)*)(?:\d{1,3}\.\s|\(\d{1,3}\)\s|[a-zA-Z]\.\s|\([a-zA-Z]\)\s|[ivxlIVXL]{1,4}\.\s|\([ivxlIVXL]{1,4}\)\s)/,
    function (match, prefix) {
      return prefix;
    },
  );

  cleaned = cleaned.replace(/^\s*<span[^>]*>\s*<\/span>\s*/, "").trim();
  return cleaned || inner.trim();
}

/**
 * Build <ul> or <ol> HTML from buffer of items with nesting support
 */
function buildListHtml(buffer, listType) {
  if (buffer.length === 0) return "";

  var html = "";
  var currentIndent = 0;
  var openLists = 0;

  // Start the root list
  html += "<" + listType + ' class="doc-formatted-list">';
  openLists = 1;
  currentIndent = buffer[0].indent;

  for (var i = 0; i < buffer.length; i++) {
    var item = buffer[i];
    var indent = item.indent;

    if (indent > currentIndent) {
      // Open nested list
      var diff = indent - currentIndent;
      for (var n = 0; n < diff; n++) {
        html += "<" + listType + ' class="doc-nested-list">';
        openLists++;
      }
      currentIndent = indent;
    } else if (indent < currentIndent) {
      // Close nested lists
      var diff = currentIndent - indent;
      for (var n = 0; n < diff; n++) {
        html += "</li></" + listType + ">";
        openLists--;
      }
      currentIndent = indent;
    }

    html += "<li>" + item.content + "</li>";
  }

  // Close all open lists
  while (openLists > 0) {
    html += "</" + listType + ">";
    openLists--;
  }

  return html;
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
 * Resolve authenticated user email for web-app calls.
 * Priority:
 * 1) Google session email (if available)
 * 2) Client auth context validated against Users sheet (userId + email)
 *
 * @param {Object=} userContext - { userId, email }
 * @returns {string} verified email or empty string
 */
function resolveAuthenticatedEmailFromContext(userContext) {
  try {
    const sessionEmail = Session.getActiveUser().getEmail();
    if (sessionEmail && sessionEmail !== "anonymous") {
      return String(sessionEmail).trim();
    }

    if (!userContext || !userContext.userId) {
      return "";
    }

    const userId = String(userContext.userId || "").trim();
    const contextEmail = String(userContext.email || "").trim();
    if (!userId) return "";

    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) return "";

    const allData = usersSheet.getDataRange().getValues();
    if (!allData || allData.length <= 1) return "";

    const headers = allData[0];
    const userIdCol = headers.indexOf("userId");
    const emailCol = headers.indexOf("email");
    const isActiveCol = headers.indexOf("isActive");
    if (userIdCol < 0 || emailCol < 0) return "";

    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][userIdCol] || "").trim() !== userId) continue;

      const matchedEmail = String(allData[i][emailCol] || "").trim();
      const isActive = isActiveCol >= 0 ? allData[i][isActiveCol] : true;
      const isDisabled = isActive === false || isActive === "FALSE";
      if (isDisabled) return "";

      if (contextEmail && contextEmail !== matchedEmail) {
        return "";
      }

      return matchedEmail;
    }

    return "";
  } catch (error) {
    Logger.log(
      "Error resolving authenticated email from context: " + error.toString(),
    );
    return "";
  }
}

/**
 * Get or create Quiz_Results sheet in user's personal sheet
 * @param {Spreadsheet} spreadsheet - User's spreadsheet
 * @returns {Sheet} - Quiz_Results sheet
 */
function getOrCreateQuizResultsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("Quiz_Results");
  const requiredHeaders = [
    "id",
    "userId",
    "mode",
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
  ];

  if (!sheet) {
    Logger.log("Creating Quiz_Results sheet...");
    sheet = spreadsheet.insertSheet("Quiz_Results");
    sheet.appendRow(requiredHeaders);

    // Style header
    const headerRange = sheet.getRange(1, 1, 1, requiredHeaders.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5B6FF8");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
    return sheet;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];
  const nextHeaders = currentHeaders.slice();
  let changed = false;

  requiredHeaders.forEach(function (header) {
    if (nextHeaders.indexOf(header) === -1) {
      nextHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, nextHeaders.length).setValues([nextHeaders]);
    const headerRange = sheet.getRange(1, 1, 1, nextHeaders.length);
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
 * Get or create XP_Log sheet and ensure schema for both daily quests and topic rewards.
 */
function getOrCreateXPLogSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("XP_Log");
  const requiredHeaders = [
    "date",
    "timestamp",
    "questId",
    "questTitle",
    "xpAmount",
    "source",
    "topicId",
    "eventId",
    "meta",
  ];

  if (!sheet) {
    sheet = spreadsheet.insertSheet("XP_Log");
    sheet.appendRow(requiredHeaders);
    const headerRange = sheet.getRange(1, 1, 1, requiredHeaders.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#F59E0B");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
    return sheet;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];
  let updatedHeaders = currentHeaders.slice();
  let changed = false;

  requiredHeaders.forEach(function (header) {
    if (updatedHeaders.indexOf(header) === -1) {
      updatedHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
    sheet.getRange(1, 1, 1, updatedHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Update totalXP in master DB for a given user email.
 */
function addXPToUserTotalByEmail(userEmail, xpDelta) {
  try {
    const masterDbId = DB_CONFIG.SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(masterDbId);
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf("email");
    const xpCol = headers.indexOf("totalXP");

    if (emailCol < 0 || xpCol < 0) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).trim() !== String(userEmail).trim()) {
        continue;
      }

      const currentXP = parseInt(data[i][xpCol]) || 0;
      const newTotalXP = currentXP + (parseInt(xpDelta, 10) || 0);
      usersSheet.getRange(i + 1, xpCol + 1).setValue(newTotalXP);
      return newTotalXP;
    }

    return null;
  } catch (error) {
    Logger.log("❌ Error updating totalXP: " + error.toString());
    return null;
  }
}

/**
 * Award XP for a topic-related milestone exactly once per eventId.
 */
function awardTopicXPByEvent(userEmail, config) {
  try {
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "User not logged in" };
    }

    const xpAmount = parseInt(config && config.xpAmount, 10) || 0;
    const eventId = String((config && config.eventId) || "").trim();
    if (!eventId || xpAmount <= 0) {
      return { success: false, message: "Invalid XP event config" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "No personal sheet" };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const xpSheet = getOrCreateXPLogSheet(userSpreadsheet);
    const data = xpSheet.getDataRange().getValues();
    const headers = data[0] || [];
    const eventIdCol = headers.indexOf("eventId");
    const questIdCol = headers.indexOf("questId");

    for (let i = 1; i < data.length; i++) {
      const rowEventId = eventIdCol >= 0 ? data[i][eventIdCol] : "";
      const rowQuestId = questIdCol >= 0 ? data[i][questIdCol] : "";
      if (
        String(rowEventId || "").trim() === eventId ||
        String(rowQuestId || "").trim() === eventId
      ) {
        return {
          success: true,
          awarded: false,
          alreadyAwarded: true,
          message: "XP already awarded for this event",
        };
      }
    }

    const today = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "yyyy-MM-dd",
    );
    const nowIso = new Date().toISOString();
    const topicId = String((config && config.topicId) || "").trim();
    const title = String((config && config.title) || eventId).trim();
    const source = String(
      (config && config.source) || "topic_completion",
    ).trim();
    const metaRaw = config && config.meta != null ? config.meta : "";
    const meta =
      typeof metaRaw === "string" ? metaRaw : JSON.stringify(metaRaw || {});

    xpSheet.appendRow([
      today,
      nowIso,
      eventId,
      title,
      xpAmount,
      source,
      topicId,
      eventId,
      meta,
    ]);

    const newTotalXP = addXPToUserTotalByEmail(userEmail, xpAmount);

    return {
      success: true,
      awarded: true,
      xpAwarded: xpAmount,
      newTotalXP: newTotalXP,
      eventId: eventId,
      message: "+" + xpAmount + " XP",
    };
  } catch (error) {
    Logger.log("❌ Error awarding topic XP: " + error.toString());
    return { success: false, message: error.toString() };
  }
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

    const userId = getUserIdByEmail(userEmail) || "";
    const headers = quizSheet
      .getRange(1, 1, 1, Math.max(quizSheet.getLastColumn(), 1))
      .getValues()[0];

    const sourceQuestionDetails =
      resultData.questionDetails || resultData.answers || [];
    const normalizedQuestionDetails = Array.isArray(sourceQuestionDetails)
      ? sourceQuestionDetails.map(function (item, idx) {
          const options = Array.isArray(item && item.options) ? item.options : [];
          const userAnswer =
            item && item.userAnswer !== undefined && item.userAnswer !== null
              ? item.userAnswer
              : null;
          const correctAnswer =
            item && item.correctAnswer !== undefined && item.correctAnswer !== null
              ? item.correctAnswer
              : null;
          const parsedUserIdx =
            typeof userAnswer === "number" ? userAnswer : parseInt(userAnswer, 10);
          const parsedCorrectIdx =
            typeof correctAnswer === "number"
              ? correctAnswer
              : parseInt(correctAnswer, 10);
          const userAnswerIndex = Number.isFinite(parsedUserIdx)
            ? parsedUserIdx
            : null;
          const correctAnswerIndex = Number.isFinite(parsedCorrectIdx)
            ? parsedCorrectIdx
            : null;

          return {
            questionId: item && item.questionId ? String(item.questionId) : "Q_" + (idx + 1),
            question: item && item.question ? String(item.question) : "",
            options: options,
            userAnswer: userAnswerIndex,
            userAnswerText:
              userAnswerIndex !== null && options[userAnswerIndex] !== undefined
                ? String(options[userAnswerIndex])
                : item && item.userAnswerText
                  ? String(item.userAnswerText)
                  : "",
            correctAnswer: correctAnswerIndex,
            correctAnswerText:
              correctAnswerIndex !== null && options[correctAnswerIndex] !== undefined
                ? String(options[correctAnswerIndex])
                : item && item.correctAnswerText
                  ? String(item.correctAnswerText)
                  : "",
            isCorrect:
              item && typeof item.isCorrect === "boolean"
                ? item.isCorrect
                : userAnswerIndex !== null &&
                    correctAnswerIndex !== null &&
                    userAnswerIndex === correctAnswerIndex,
          };
        })
      : [];

    const rowMap = {
      id: "QR_" + Date.now(),
      userId: userId,
      mode: "quiz",
      topicId: resultData.topicId || "",
      topicTitle: resultData.topicTitle || "",
      score: resultData.score || 0,
      totalQuestions: resultData.totalQuestions || 0,
      percentage: resultData.percentage || 0,
      timeTaken: resultData.timeTaken || "",
      gameMode: resultData.gameMode || "instant",
      status: resultData.status || "complete",
      currentQuestionIndex: resultData.currentQuestionIndex || 0,
      completedAt: resultData.completedAt || new Date().toISOString(),
      questionDetails: JSON.stringify(normalizedQuestionDetails),
    };

    const resultEntry = headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(rowMap, header)
        ? rowMap[header]
        : "";
    });

    quizSheet.appendRow(resultEntry);

    Logger.log("✅ Quiz result saved to PERSONAL sheet successfully");

    // Award topic completion XP for completed quiz attempts (not partial autosave).
    const quizStatus = String(resultData.status || "complete").toLowerCase();
    if (resultData.topicId && quizStatus !== "partial") {
      const quizXPResult = awardTopicXPByEvent(userEmail, {
        topicId: resultData.topicId,
        eventId: "quiz_topic_completed:" + String(resultData.topicId).trim(),
        title:
          "Hoan thanh Quiz chu de: " +
          String(resultData.topicTitle || resultData.topicId),
        xpAmount: 200,
        source: "topic_quiz_completion",
        meta: {
          percentage: resultData.percentage,
          score: resultData.score,
          totalQuestions: resultData.totalQuestions,
        },
      });

      if (quizXPResult && quizXPResult.awarded) {
        Logger.log(
          "✅ Quiz topic XP awarded: " +
            String(resultData.topicId) +
            " (+" +
            String(quizXPResult.xpAwarded) +
            ")",
        );
      }
    }

    // ⭐ Also update quizDone in Topic_Progress
    if (resultData.topicId) {
      try {
        const userId = getUserIdByEmail(userEmail);
        if (userId) {
          updateQuizDoneInTopicProgress(userId, resultData.topicId);
        }
      } catch (e) {
        Logger.log(
          "⚠️ Failed to update quizDone in Topic_Progress: " + e.toString(),
        );
      }
    }

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
 * ⭐ Update quizDone in Topic_Progress sheet
 */
function updateQuizDoneInTopicProgress(userId, topicId) {
  try {
    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) return;

    let sheet = spreadsheet.getSheetByName("Topic_Progress");
    if (!sheet) {
      // Create Topic_Progress sheet if it doesn't exist
      sheet = spreadsheet.insertSheet("Topic_Progress");
      const headers = [
        "progressId",
        "topicId",
        "topicTitle",
        "lessonCompleted",
        "miniQuizCompleted",
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
    const topicIdCol = headers.indexOf("topicId");
    const quizDoneCol = headers.indexOf("quizDone");
    const lastUpdatedCol = headers.indexOf("lastUpdated");
    const statusCol = headers.indexOf("status");
    const completedAtCol = headers.indexOf("completedAt");
    const now = new Date();

    if (quizDoneCol < 0) {
      Logger.log("⚠️ quizDone column not found in Topic_Progress");
      return;
    }

    // Find existing row for this topic
    let rowIndex = -1;
    var topicIdStr = String(topicId).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][topicIdCol]).trim() === topicIdStr) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      // Create new row
      var progressId = "PRG_" + Date.now().toString(36);
      var newRow = new Array(headers.length).fill("");
      newRow[headers.indexOf("progressId")] = progressId;
      newRow[topicIdCol] = topicId;
      newRow[quizDoneCol] = 1;
      newRow[headers.indexOf("status")] = "in_progress";
      newRow[headers.indexOf("unlockedAt")] = now;
      newRow[headers.indexOf("lastUpdated")] = now;
      sheet.appendRow(newRow);
      Logger.log(
        "✅ Created new Topic_Progress row with quizDone=1 for: " + topicId,
      );
    } else {
      // Update existing row
      sheet.getRange(rowIndex, quizDoneCol + 1).setValue(1);
      if (lastUpdatedCol >= 0)
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);

      // Check if ALL activities are now complete
      var currentData = sheet
        .getRange(rowIndex, 1, 1, headers.length)
        .getValues()[0];
      var lessonDone = currentData[headers.indexOf("lessonCompleted")] === 1;
      var mindmapDone = currentData[headers.indexOf("mindmapViewed")] === 1;
      var flashcardsDone =
        currentData[headers.indexOf("flashcardsCompleted")] === 1;

      if (lessonDone && mindmapDone && flashcardsDone) {
        // All 4 activities done (quiz is now done too)
        if (statusCol >= 0)
          sheet.getRange(rowIndex, statusCol + 1).setValue("completed");
        if (completedAtCol >= 0)
          sheet.getRange(rowIndex, completedAtCol + 1).setValue(now);
      }

      Logger.log("✅ Updated quizDone=1 in Topic_Progress for: " + topicId);
    }
  } catch (error) {
    Logger.log("❌ Error updating quizDone: " + error.toString());
  }
}

/**
 * Get or create Matching_Results sheet in user's personal spreadsheet
 */
function getOrCreateMatchingResultsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName("Matching_Results");
  const requiredHeaders = [
    "id",
    "userId",
    "mode",
    "topicId",
    "topicTitle",
    "difficulty",
    "totalPairs",
    "correctPairs",
    "wrongAttempts",
    "score",
    "elapsedTime",
    "accuracy",
    "completed",
    "playedAt",
    "pairDetails",
  ];

  if (!sheet) {
    sheet = spreadsheet.insertSheet("Matching_Results");
    sheet.appendRow(requiredHeaders);
    const headerRange = sheet.getRange(1, 1, 1, requiredHeaders.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#a78bfa");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
    return sheet;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];
  const nextHeaders = currentHeaders.slice();
  let changed = false;

  requiredHeaders.forEach(function (header) {
    if (nextHeaders.indexOf(header) === -1) {
      nextHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, nextHeaders.length).setValues([nextHeaders]);
    const headerRange = sheet.getRange(1, 1, 1, nextHeaders.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#a78bfa");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Save matching game result to user's personal Google Sheet
 * @param {object} resultData - Matching result data
 * @returns {object} - {success, message}
 */
function saveMatchingResult(resultData) {
  try {
    Logger.log("=== SAVE MATCHING RESULT TO PERSONAL SHEET ===");
    Logger.log("Result data: " + JSON.stringify(resultData));

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      Logger.log("⚠️ No user email, cannot save to personal sheet");
      return { success: false, message: "User not logged in" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      Logger.log("⚠️ User doesn't have personal sheet");
      return { success: false, message: "User personal sheet not found" };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const matchingSheet = getOrCreateMatchingResultsSheet(userSpreadsheet);

    const userId = getUserIdByEmail(userEmail) || "";
    const headers = matchingSheet
      .getRange(1, 1, 1, Math.max(matchingSheet.getLastColumn(), 1))
      .getValues()[0];

    const sourcePairDetails = Array.isArray(resultData.pairDetails)
      ? resultData.pairDetails
      : [];
    const normalizedPairDetails = sourcePairDetails.map(function (item, idx) {
      return {
        order: item && Number.isFinite(parseInt(item.order, 10))
          ? parseInt(item.order, 10)
          : idx + 1,
        leftText: item && item.leftText ? String(item.leftText) : "",
        userMatchedRight:
          item && item.userMatchedRight ? String(item.userMatchedRight) : "",
        correctRight: item && item.correctRight ? String(item.correctRight) : "",
        isCorrect: !!(item && item.isCorrect),
      };
    });

    const rowMap = {
      id: "MR_" + Date.now(),
      userId: userId,
      mode: "matching",
      topicId: resultData.topicId || "",
      topicTitle: resultData.topicTitle || "",
      difficulty: resultData.difficulty || "medium",
      totalPairs: resultData.totalPairs || 0,
      correctPairs: resultData.correctPairs || 0,
      wrongAttempts: resultData.wrongAttempts || 0,
      score: resultData.score || 0,
      elapsedTime: resultData.elapsedTime || 0,
      accuracy: resultData.accuracy || 0,
      completed: resultData.completed !== false,
      playedAt: resultData.playedAt || new Date().toISOString(),
      pairDetails: JSON.stringify(normalizedPairDetails),
    };

    const resultEntry = headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(rowMap, header)
        ? rowMap[header]
        : "";
    });

    matchingSheet.appendRow(resultEntry);
    Logger.log("✅ Matching result saved to personal sheet");

    // Award topic completion XP for completed matching attempts.
    if (resultData.topicId && resultData.completed !== false) {
      const matchingXPResult = awardTopicXPByEvent(userEmail, {
        topicId: resultData.topicId,
        eventId:
          "matching_topic_completed:" + String(resultData.topicId).trim(),
        title:
          "Hoan thanh Matching chu de: " +
          String(resultData.topicTitle || resultData.topicId),
        xpAmount: 200,
        source: "topic_matching_completion",
        meta: {
          accuracy: resultData.accuracy,
          score: resultData.score,
          totalPairs: resultData.totalPairs,
        },
      });

      if (matchingXPResult && matchingXPResult.awarded) {
        Logger.log(
          "✅ Matching topic XP awarded: " +
            String(resultData.topicId) +
            " (+" +
            String(matchingXPResult.xpAwarded) +
            ")",
        );
      }
    }

    // Also update matchingDone in Topic_Progress
    if (resultData.topicId) {
      try {
        const userId = getUserIdByEmail(userEmail);
        if (userId) {
          updateMatchingDoneInTopicProgress(userId, resultData.topicId);
        }
      } catch (e) {
        Logger.log(
          "⚠️ Failed to update matchingDone in Topic_Progress: " + e.toString(),
        );
      }
    }

    return { success: true, message: "Matching result saved" };
  } catch (error) {
    Logger.log("❌ Error saving matching result: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Update matchingDone in Topic_Progress sheet
 */
function updateMatchingDoneInTopicProgress(userId, topicId) {
  try {
    const spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) return;

    let sheet = spreadsheet.getSheetByName("Topic_Progress");
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Topic_Progress");
      const headers = [
        "progressId",
        "topicId",
        "topicTitle",
        "lessonCompleted",
        "miniQuizCompleted",
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
    const topicIdCol = headers.indexOf("topicId");
    const matchingDoneCol = headers.indexOf("matchingDone");
    const lastUpdatedCol = headers.indexOf("lastUpdated");
    const statusCol = headers.indexOf("status");
    const completedAtCol = headers.indexOf("completedAt");
    const now = new Date();

    if (matchingDoneCol < 0) {
      Logger.log("⚠️ matchingDone column not found in Topic_Progress");
      return;
    }

    // Find existing row for this topic
    let rowIndex = -1;
    var topicIdStr = String(topicId).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][topicIdCol]).trim() === topicIdStr) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      // Create new row
      var progressId = "PRG_" + Date.now().toString(36);
      var newRow = new Array(headers.length).fill("");
      newRow[headers.indexOf("progressId")] = progressId;
      newRow[topicIdCol] = topicId;
      newRow[matchingDoneCol] = 1;
      newRow[headers.indexOf("status")] = "in_progress";
      newRow[headers.indexOf("unlockedAt")] = now;
      newRow[headers.indexOf("lastUpdated")] = now;
      sheet.appendRow(newRow);
      Logger.log(
        "✅ Created new Topic_Progress row with matchingDone=1 for: " + topicId,
      );
    } else {
      // Update existing row
      sheet.getRange(rowIndex, matchingDoneCol + 1).setValue(1);
      if (lastUpdatedCol >= 0)
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);

      // Check if ALL activities are now complete
      var currentData = sheet
        .getRange(rowIndex, 1, 1, headers.length)
        .getValues()[0];
      var lessonDone = currentData[headers.indexOf("lessonCompleted")] === 1;
      var mindmapDone = currentData[headers.indexOf("mindmapViewed")] === 1;
      var flashcardsDone =
        currentData[headers.indexOf("flashcardsCompleted")] === 1;
      var quizDone = currentData[headers.indexOf("quizDone")] === 1;

      if (lessonDone && mindmapDone && flashcardsDone && quizDone) {
        if (statusCol >= 0)
          sheet.getRange(rowIndex, statusCol + 1).setValue("completed");
        if (completedAtCol >= 0)
          sheet.getRange(rowIndex, completedAtCol + 1).setValue(now);
      }

      Logger.log("✅ Updated matchingDone=1 in Topic_Progress for: " + topicId);
    }
  } catch (error) {
    Logger.log("❌ Error updating matchingDone: " + error.toString());
  }
}

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
function getDashboardData(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
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
            topicId:
              ac["topicId"] >= 0 ? String(actData[i][ac["topicId"]]) : "",
            topicTitle:
              ac["topicTitle"] >= 0 ? String(actData[i][ac["topicTitle"]]) : "",
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

        // ⭐ Enrich Learning activities with contentDocId from Topics sheet
        try {
          var learningActivities = activities.filter(function (a) {
            return a.type === "Learning" && a.topicId;
          });
          if (learningActivities.length > 0) {
            var topicsSSId = "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
            var topicsSS = SpreadsheetApp.openById(topicsSSId);
            var topicsSheet = topicsSS.getSheetByName("Topics");
            if (topicsSheet) {
              var topicsData = topicsSheet.getDataRange().getValues();
              var topicDocMap = {};
              for (var ti = 1; ti < topicsData.length; ti++) {
                var tId = String(topicsData[ti][0]).trim();
                var docId = String(topicsData[ti][13] || "").trim();
                if (tId && docId) {
                  topicDocMap[tId] = docId;
                }
              }
              for (var ai = 0; ai < activities.length; ai++) {
                if (
                  activities[ai].type === "Learning" &&
                  activities[ai].topicId
                ) {
                  var mappedDocId =
                    topicDocMap[String(activities[ai].topicId).trim()];
                  if (mappedDocId) {
                    activities[ai].contentDocId = mappedDocId;
                  }
                }
              }
              Logger.log(
                "✅ Enriched activities with contentDocId from Topics sheet",
              );
            }
          }
        } catch (enrichError) {
          Logger.log(
            "⚠️ Could not enrich activities with contentDocId: " +
              enrichError.toString(),
          );
        }
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
    const todayMatching = todayActivities.filter(
      (a) => a.type === "Matching",
    ).length;
    const todayPerfect = todayActivities.filter(
      (a) =>
        (a.type === "MCQ" || a.type === "Matching") && a.percentage === 100,
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
        questId: "daily_matching",
        title: "Hoàn thành 1 Bài Matching",
        progress: Math.min(todayMatching, 1),
        target: 1,
        xpReward: 50,
        done: todayMatching >= 1,
        claimed: !!claimedQuests["daily_matching"],
      },
      {
        questId: "daily_perfect",
        title: "Đạt điểm tuyệt đối 1 bài Quiz/Matching",
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
    const roleColExists = typeof col["role"] === "number";
    for (let i = 1; i < allData.length; i++) {
      const xp = parseInt(allData[i][col["totalXP"]]) || 0;
      const isActive = allData[i][col["isActive"]];
      const role = roleColExists
        ? String(allData[i][col["role"]] || "")
            .trim()
            .toUpperCase()
        : "USER";

      if (isActive === false || isActive === "FALSE") continue;
      if (role === "ADMIN") continue;

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
function completeQuestAndAwardXP(questId, userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
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
      daily_matching: {
        title: "Hoàn thành 1 Bài Matching",
        xp: 50,
        source: "daily_quest",
      },
      daily_perfect: {
        title: "Đạt điểm tuyệt đối 1 bài Quiz/Matching",
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
      case "daily_matching":
      case "daily_perfect": {
        const actSheet = spreadsheet.getSheetByName("Activity_Log");
        if (!actSheet) return { done: false };
        const actData = actSheet.getDataRange().getValues();
        const actHeaders = actData[0];
        const ac = {};
        actHeaders.forEach((h, i) => (ac[h] = i));

        let todayLearning = 0,
          todayMCQ = 0,
          todayMatching = 0,
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
          if (type === "Matching") {
            todayMatching++;
            const pct =
              ac["percentage"] >= 0
                ? parseInt(actData[i][ac["percentage"]])
                : 0;
            if (pct === 100) todayPerfect++;
          }
        }

        if (questId === "daily_learn") return { done: todayLearning >= 1 };
        if (questId === "daily_quiz") return { done: todayMCQ >= 1 };
        if (questId === "daily_matching") return { done: todayMatching >= 1 };
        if (questId === "daily_perfect") return { done: todayPerfect >= 1 };
        return { done: false };
      }
      case "daily_all_bonus": {
        // All main quests must be claimed
        const mainQuestIds = [
          "daily_checkin",
          "daily_learn",
          "daily_quiz",
          "daily_matching",
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
 * Get quiz play history for a specific topic from current user's personal sheet.
 * @param {string} topicId
 * @param {number=} limit
 * @returns {{success:boolean, history:Array, message?:string}}
 */
function getQuizHistoryByTopic(topicId, limit) {
  try {
    const topicIdStr = String(topicId || "").trim();
    if (!topicIdStr) {
      return { success: false, message: "Thiếu topicId", history: [] };
    }

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", history: [] };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: true, history: [] };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");
    if (!quizSheet) {
      return { success: true, history: [] };
    }

    const data = quizSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, history: [] };
    }

    const headers = data[0];
    const idCol = headers.indexOf("id");
    const userIdCol = headers.indexOf("userId");
    const modeCol = headers.indexOf("mode");
    const topicIdCol = headers.indexOf("topicId");
    const topicTitleCol = headers.indexOf("topicTitle");
    const scoreCol = headers.indexOf("score");
    const totalQuestionsCol = headers.indexOf("totalQuestions");
    const percentageCol = headers.indexOf("percentage");
    const timeTakenCol = headers.indexOf("timeTaken");
    const gameModeCol = headers.indexOf("gameMode");
    const statusCol = headers.indexOf("status");
    const completedAtCol = headers.indexOf("completedAt");

    const history = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][topicIdCol] || "").trim() !== topicIdStr) continue;

      const mode = modeCol >= 0 ? String(data[i][modeCol] || "") : "quiz";
      if (mode && mode !== "quiz") continue;

      const status = statusCol >= 0 ? String(data[i][statusCol] || "") : "";
      if (status && status === "partial") continue;

      history.push({
        id: idCol >= 0 ? String(data[i][idCol] || "") : "",
        userId: userIdCol >= 0 ? String(data[i][userIdCol] || "") : "",
        mode: mode || "quiz",
        topicId: topicIdCol >= 0 ? String(data[i][topicIdCol] || "") : "",
        topicTitle:
          topicTitleCol >= 0 ? String(data[i][topicTitleCol] || "") : "",
        score: scoreCol >= 0 ? parseInt(data[i][scoreCol]) || 0 : 0,
        totalQuestions:
          totalQuestionsCol >= 0
            ? parseInt(data[i][totalQuestionsCol]) || 0
            : 0,
        percentage:
          percentageCol >= 0 ? parseInt(data[i][percentageCol]) || 0 : 0,
        timeTaken: timeTakenCol >= 0 ? String(data[i][timeTakenCol] || "") : "",
        gameMode: gameModeCol >= 0 ? String(data[i][gameModeCol] || "") : "",
        completedAt:
          completedAtCol >= 0 ? String(data[i][completedAtCol] || "") : "",
      });
    }

    history.sort(
      (a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0),
    );

    const maxItems = Math.max(1, parseInt(limit, 10) || 30);
    return { success: true, history: history.slice(0, maxItems) };
  } catch (error) {
    Logger.log("❌ Error in getQuizHistoryByTopic: " + error.toString());
    return { success: false, message: error.toString(), history: [] };
  }
}

/**
 * Get quiz attempt detail by result ID from current user's personal sheet.
 * @param {string} resultId
 * @returns {{success:boolean, detail:Object|null, message?:string}}
 */
function getQuizResultDetailById(resultId) {
  try {
    const id = String(resultId || "").trim();
    if (!id) {
      return { success: false, message: "Thiếu resultId", detail: null };
    }

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", detail: null };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "No personal sheet", detail: null };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");
    if (!quizSheet) {
      return { success: false, message: "No Quiz_Results sheet", detail: null };
    }

    const data = quizSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: "No data", detail: null };
    }

    const headers = data[0];
    const idCol = headers.indexOf("id");
    const userIdCol = headers.indexOf("userId");
    const modeCol = headers.indexOf("mode");
    const topicIdCol = headers.indexOf("topicId");
    const topicTitleCol = headers.indexOf("topicTitle");
    const scoreCol = headers.indexOf("score");
    const totalQuestionsCol = headers.indexOf("totalQuestions");
    const percentageCol = headers.indexOf("percentage");
    const timeTakenCol = headers.indexOf("timeTaken");
    const gameModeCol = headers.indexOf("gameMode");
    const statusCol = headers.indexOf("status");
    const completedAtCol = headers.indexOf("completedAt");
    const questionDetailsCol = headers.indexOf("questionDetails");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol] || "").trim() !== id) continue;

      let questionDetails = [];
      if (questionDetailsCol >= 0) {
        try {
          questionDetails = JSON.parse(
            String(data[i][questionDetailsCol] || "[]"),
          );
        } catch (e) {
          questionDetails = [];
        }
      }

      const normalizedQuestionDetails = Array.isArray(questionDetails)
        ? questionDetails.map(function (item, idx) {
            const options = Array.isArray(item && item.options) ? item.options : [];
            const userAnswer =
              item && item.userAnswer !== undefined && item.userAnswer !== null
                ? item.userAnswer
                : null;
            const correctAnswer =
              item && item.correctAnswer !== undefined && item.correctAnswer !== null
                ? item.correctAnswer
                : null;
            const parsedUserIdx =
              typeof userAnswer === "number"
                ? userAnswer
                : parseInt(userAnswer, 10);
            const parsedCorrectIdx =
              typeof correctAnswer === "number"
                ? correctAnswer
                : parseInt(correctAnswer, 10);
            const userAnswerIndex = Number.isFinite(parsedUserIdx)
              ? parsedUserIdx
              : null;
            const correctAnswerIndex = Number.isFinite(parsedCorrectIdx)
              ? parsedCorrectIdx
              : null;

            return {
              questionId:
                item && item.questionId ? String(item.questionId) : "Q_" + (idx + 1),
              question: item && item.question ? String(item.question) : "",
              options: options,
              userAnswer: userAnswerIndex,
              userAnswerText:
                item && item.userAnswerText
                  ? String(item.userAnswerText)
                  : userAnswerIndex !== null && options[userAnswerIndex] !== undefined
                    ? String(options[userAnswerIndex])
                    : "",
              correctAnswer: correctAnswerIndex,
              correctAnswerText:
                item && item.correctAnswerText
                  ? String(item.correctAnswerText)
                  : correctAnswerIndex !== null &&
                      options[correctAnswerIndex] !== undefined
                    ? String(options[correctAnswerIndex])
                    : "",
              isCorrect:
                item && typeof item.isCorrect === "boolean"
                  ? item.isCorrect
                  : userAnswerIndex !== null &&
                      correctAnswerIndex !== null &&
                      userAnswerIndex === correctAnswerIndex,
            };
          })
        : [];

      const mode = modeCol >= 0 ? String(data[i][modeCol] || "") : "quiz";
      if (mode && mode !== "quiz") continue;

      return {
        success: true,
        detail: {
          id: id,
          userId: userIdCol >= 0 ? String(data[i][userIdCol] || "") : "",
          mode: mode || "quiz",
          topicId: topicIdCol >= 0 ? String(data[i][topicIdCol] || "") : "",
          topicTitle:
            topicTitleCol >= 0 ? String(data[i][topicTitleCol] || "") : "",
          score: scoreCol >= 0 ? parseInt(data[i][scoreCol]) || 0 : 0,
          totalQuestions:
            totalQuestionsCol >= 0
              ? parseInt(data[i][totalQuestionsCol]) || 0
              : 0,
          percentage:
            percentageCol >= 0 ? parseInt(data[i][percentageCol]) || 0 : 0,
          timeTaken:
            timeTakenCol >= 0 ? String(data[i][timeTakenCol] || "") : "",
          gameMode: gameModeCol >= 0 ? String(data[i][gameModeCol] || "") : "",
          status: statusCol >= 0 ? String(data[i][statusCol] || "") : "",
          completedAt:
            completedAtCol >= 0 ? String(data[i][completedAtCol] || "") : "",
          questionDetails: normalizedQuestionDetails,
        },
      };
    }

    return { success: false, message: "Không tìm thấy lần chơi", detail: null };
  } catch (error) {
    Logger.log("❌ Error in getQuizResultDetailById: " + error.toString());
    return { success: false, message: error.toString(), detail: null };
  }
}

/**
 * Get matching play history for a specific topic from current user's personal sheet.
 * @param {string} topicId
 * @param {number=} limit
 * @returns {{success:boolean, history:Array, message?:string}}
 */
function getMatchingHistoryByTopic(topicId, limit) {
  try {
    const topicIdStr = String(topicId || "").trim();
    if (!topicIdStr) {
      return { success: false, message: "Thiếu topicId", history: [] };
    }

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", history: [] };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: true, history: [] };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const matchingSheet = userSpreadsheet.getSheetByName("Matching_Results");
    if (!matchingSheet) {
      return { success: true, history: [] };
    }

    const data = matchingSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, history: [] };
    }

    const headers = data[0];
    const idCol = headers.indexOf("id");
    const userIdCol = headers.indexOf("userId");
    const modeCol = headers.indexOf("mode");
    const topicIdCol = headers.indexOf("topicId");
    const topicTitleCol = headers.indexOf("topicTitle");
    const difficultyCol = headers.indexOf("difficulty");
    const totalPairsCol = headers.indexOf("totalPairs");
    const correctPairsCol = headers.indexOf("correctPairs");
    const wrongAttemptsCol = headers.indexOf("wrongAttempts");
    const scoreCol = headers.indexOf("score");
    const elapsedTimeCol = headers.indexOf("elapsedTime");
    const accuracyCol = headers.indexOf("accuracy");
    const completedCol = headers.indexOf("completed");
    const playedAtCol = headers.indexOf("playedAt");
    const pairDetailsCol = headers.indexOf("pairDetails");

    const history = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][topicIdCol] || "").trim() !== topicIdStr) continue;

      const mode = modeCol >= 0 ? String(data[i][modeCol] || "") : "matching";
      if (mode && mode !== "matching") continue;

      const completed = completedCol >= 0 ? data[i][completedCol] : true;
      if (completed === false || completed === "FALSE") continue;

      let pairDetails = [];
      if (pairDetailsCol >= 0) {
        try {
          pairDetails = JSON.parse(String(data[i][pairDetailsCol] || "[]"));
        } catch (e) {
          pairDetails = [];
        }
      }

      history.push({
        id: idCol >= 0 ? String(data[i][idCol] || "") : "",
        userId: userIdCol >= 0 ? String(data[i][userIdCol] || "") : "",
        mode: mode || "matching",
        topicId: topicIdCol >= 0 ? String(data[i][topicIdCol] || "") : "",
        topicTitle:
          topicTitleCol >= 0 ? String(data[i][topicTitleCol] || "") : "",
        difficulty:
          difficultyCol >= 0 ? String(data[i][difficultyCol] || "") : "medium",
        totalPairs:
          totalPairsCol >= 0 ? parseInt(data[i][totalPairsCol]) || 0 : 0,
        correctPairs:
          correctPairsCol >= 0 ? parseInt(data[i][correctPairsCol]) || 0 : 0,
        wrongAttempts:
          wrongAttemptsCol >= 0 ? parseInt(data[i][wrongAttemptsCol]) || 0 : 0,
        score: scoreCol >= 0 ? parseInt(data[i][scoreCol]) || 0 : 0,
        elapsedTime:
          elapsedTimeCol >= 0 ? parseInt(data[i][elapsedTimeCol]) || 0 : 0,
        accuracy: accuracyCol >= 0 ? parseInt(data[i][accuracyCol]) || 0 : 0,
        playedAt: playedAtCol >= 0 ? String(data[i][playedAtCol] || "") : "",
        pairDetails: Array.isArray(pairDetails) ? pairDetails : [],
      });
    }

    history.sort(
      (a, b) => new Date(b.playedAt || 0) - new Date(a.playedAt || 0),
    );
    const maxItems = Math.max(1, parseInt(limit, 10) || 30);
    return { success: true, history: history.slice(0, maxItems) };
  } catch (error) {
    Logger.log("❌ Error in getMatchingHistoryByTopic: " + error.toString());
    return { success: false, message: error.toString(), history: [] };
  }
}

/**
 * Get matching attempt detail by result ID from current user's personal sheet.
 * @param {string} resultId
 * @returns {{success:boolean, detail:Object|null, message?:string}}
 */
function getMatchingResultDetailById(resultId) {
  try {
    const id = String(resultId || "").trim();
    if (!id) {
      return { success: false, message: "Thiếu resultId", detail: null };
    }

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", detail: null };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "No personal sheet", detail: null };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const matchingSheet = userSpreadsheet.getSheetByName("Matching_Results");
    if (!matchingSheet) {
      return {
        success: false,
        message: "No Matching_Results sheet",
        detail: null,
      };
    }

    const data = matchingSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: "No data", detail: null };
    }

    const headers = data[0];
    const idCol = headers.indexOf("id");
    const userIdCol = headers.indexOf("userId");
    const modeCol = headers.indexOf("mode");
    const topicIdCol = headers.indexOf("topicId");
    const topicTitleCol = headers.indexOf("topicTitle");
    const difficultyCol = headers.indexOf("difficulty");
    const totalPairsCol = headers.indexOf("totalPairs");
    const correctPairsCol = headers.indexOf("correctPairs");
    const wrongAttemptsCol = headers.indexOf("wrongAttempts");
    const scoreCol = headers.indexOf("score");
    const elapsedTimeCol = headers.indexOf("elapsedTime");
    const accuracyCol = headers.indexOf("accuracy");
    const completedCol = headers.indexOf("completed");
    const playedAtCol = headers.indexOf("playedAt");
    const pairDetailsCol = headers.indexOf("pairDetails");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol] || "").trim() !== id) continue;

      const mode = modeCol >= 0 ? String(data[i][modeCol] || "") : "matching";
      if (mode && mode !== "matching") continue;

      let pairDetails = [];
      if (pairDetailsCol >= 0) {
        try {
          pairDetails = JSON.parse(String(data[i][pairDetailsCol] || "[]"));
        } catch (e) {
          pairDetails = [];
        }
      }

      return {
        success: true,
        detail: {
          id: id,
          userId: userIdCol >= 0 ? String(data[i][userIdCol] || "") : "",
          mode: mode || "matching",
          topicId: topicIdCol >= 0 ? String(data[i][topicIdCol] || "") : "",
          topicTitle:
            topicTitleCol >= 0 ? String(data[i][topicTitleCol] || "") : "",
          difficulty:
            difficultyCol >= 0
              ? String(data[i][difficultyCol] || "")
              : "medium",
          totalPairs:
            totalPairsCol >= 0 ? parseInt(data[i][totalPairsCol]) || 0 : 0,
          correctPairs:
            correctPairsCol >= 0 ? parseInt(data[i][correctPairsCol]) || 0 : 0,
          wrongAttempts:
            wrongAttemptsCol >= 0
              ? parseInt(data[i][wrongAttemptsCol]) || 0
              : 0,
          score: scoreCol >= 0 ? parseInt(data[i][scoreCol]) || 0 : 0,
          elapsedTime:
            elapsedTimeCol >= 0 ? parseInt(data[i][elapsedTimeCol]) || 0 : 0,
          accuracy: accuracyCol >= 0 ? parseInt(data[i][accuracyCol]) || 0 : 0,
          completed: completedCol >= 0 ? data[i][completedCol] : true,
          playedAt: playedAtCol >= 0 ? String(data[i][playedAtCol] || "") : "",
          pairDetails: Array.isArray(pairDetails) ? pairDetails : [],
        },
      };
    }

    return { success: false, message: "Không tìm thấy lần chơi", detail: null };
  } catch (error) {
    Logger.log("❌ Error in getMatchingResultDetailById: " + error.toString());
    return { success: false, message: error.toString(), detail: null };
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
 * Reset all learning activity/progress for one topic of current user.
 * This clears topic-level history so Topic/Lesson can start fresh.
 *
 * @param {string} topicId - Topic ID to reset
 * @param {Object=} userContext - Optional auth context from client
 * @returns {Object} - { success, deleted: {...} }
 */
function clearTopicLearningData(topicId, userContext) {
  try {
    const topicIdStr = String(topicId || "").trim();
    if (!topicIdStr) {
      return { success: false, message: "Thiếu topicId" };
    }

    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "Không tìm thấy sheet cá nhân" };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const deleted = {
      activityLog: 0,
      topicProgress: 0,
      quizResults: 0,
      matchingResults: 0,
      flashcardSessions: 0,
      cardProgress: 0,
      wrongAnswers: 0,
      masteredQuestions: 0,
    };

    function deleteRowsByTopic(sheetName, topicColumnName) {
      const sheet = userSpreadsheet.getSheetByName(sheetName);
      if (!sheet) return 0;

      const data = sheet.getDataRange().getValues();
      if (!data || data.length <= 1) return 0;

      const headers = data[0] || [];
      const topicCol = headers.indexOf(topicColumnName || "topicId");
      if (topicCol < 0) return 0;

      let count = 0;
      for (let i = data.length - 1; i >= 1; i--) {
        const rowTopicId = String(data[i][topicCol] || "").trim();
        if (rowTopicId === topicIdStr) {
          sheet.deleteRow(i + 1);
          count++;
        }
      }

      return count;
    }

    deleted.activityLog = deleteRowsByTopic("Activity_Log", "topicId");
    deleted.topicProgress = deleteRowsByTopic("Topic_Progress", "topicId");
    deleted.quizResults = deleteRowsByTopic("Quiz_Results", "topicId");
    deleted.matchingResults = deleteRowsByTopic("Matching_Results", "topicId");
    deleted.flashcardSessions = deleteRowsByTopic(
      "FlashcardSessions",
      "topicId",
    );
    deleted.flashcardSessions += deleteRowsByTopic(
      "Flashcard_Sessions",
      "topicId",
    );
    deleted.cardProgress = deleteRowsByTopic("CardProgress", "topicId");
    deleted.cardProgress += deleteRowsByTopic("Flashcard_Progress", "topicId");
    deleted.wrongAnswers = deleteRowsByTopic("Wrong_Answers", "topicId");
    deleted.wrongAnswers += deleteRowsByTopic("Wrong_Answer_Memory", "topicId");
    deleted.masteredQuestions = deleteRowsByTopic(
      "Mastered_Questions",
      "topicId",
    );

    const totalDeleted = Object.keys(deleted).reduce(
      (sum, key) => sum + deleted[key],
      0,
    );

    Logger.log(
      "✅ clearTopicLearningData for " +
        topicIdStr +
        ": deleted " +
        totalDeleted +
        " rows",
    );

    return {
      success: true,
      topicId: topicIdStr,
      deleted: deleted,
      totalDeleted: totalDeleted,
      message:
        totalDeleted > 0
          ? "Đã xóa dữ liệu học của topic"
          : "Không có dữ liệu để xóa",
    };
  } catch (error) {
    Logger.log("❌ Error in clearTopicLearningData: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Backward-compatible alias.
 */
function resetTopicLearningData(topicId, userContext) {
  return clearTopicLearningData(topicId, userContext);
}

/**
 * Reset ALL learning activity/progress for current user.
 * One-call full cleanup across learning-related sheets.
 *
 * @param {Object=} userContext - Optional auth context from client
 * @returns {Object} - { success, deleted: {...}, totalDeleted }
 */
function clearAllLearningData(userContext) {
  try {
    const userEmail = resolveAuthenticatedEmailFromContext(userContext);
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Chưa đăng nhập" };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: false, message: "Không tìm thấy sheet cá nhân" };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const deleted = {
      activityLog: 0,
      topicProgress: 0,
      quizResults: 0,
      matchingResults: 0,
      flashcardSessions: 0,
      cardProgress: 0,
      wrongAnswers: 0,
      masteredQuestions: 0,
      xpLog: 0,
    };

    function clearSheetDataKeepHeader(sheetName) {
      const sheet = userSpreadsheet.getSheetByName(sheetName);
      if (!sheet) return 0;

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return 0;

      const count = lastRow - 1;
      sheet.deleteRows(2, count);
      return count;
    }

    deleted.activityLog = clearSheetDataKeepHeader("Activity_Log");
    deleted.topicProgress = clearSheetDataKeepHeader("Topic_Progress");
    deleted.quizResults = clearSheetDataKeepHeader("Quiz_Results");
    deleted.matchingResults = clearSheetDataKeepHeader("Matching_Results");
    deleted.flashcardSessions = clearSheetDataKeepHeader("FlashcardSessions");
    deleted.flashcardSessions += clearSheetDataKeepHeader("Flashcard_Sessions");
    deleted.cardProgress = clearSheetDataKeepHeader("CardProgress");
    deleted.cardProgress += clearSheetDataKeepHeader("Flashcard_Progress");
    deleted.wrongAnswers = clearSheetDataKeepHeader("Wrong_Answers");
    deleted.wrongAnswers += clearSheetDataKeepHeader("Wrong_Answer_Memory");
    deleted.masteredQuestions = clearSheetDataKeepHeader("Mastered_Questions");
    deleted.xpLog = clearSheetDataKeepHeader("XP_Log");

    const totalDeleted = Object.keys(deleted).reduce(
      (sum, key) => sum + deleted[key],
      0,
    );

    Logger.log(
      "✅ clearAllLearningData for " +
        userEmail +
        ": deleted " +
        totalDeleted +
        " rows",
    );

    return {
      success: true,
      deleted: deleted,
      totalDeleted: totalDeleted,
      message:
        totalDeleted > 0
          ? "Đã reset toàn bộ dữ liệu học"
          : "Không có dữ liệu để reset",
    };
  } catch (error) {
    Logger.log("❌ Error in clearAllLearningData: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Backward-compatible alias.
 */
function resetAllLearningData(userContext) {
  return clearAllLearningData(userContext);
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

      case "mini_quiz":
        if (progressData.completed) {
          updateData.miniQuizCompleted = 1;
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
 * Ensure Topic_Progress has the required columns for Lesson/Mindmap/Flashcards/MiniQuiz tracking.
 */
function ensureTopicProgressSchema(sheet) {
  const requiredHeaders = [
    "progressId",
    "topicId",
    "topicTitle",
    "lessonCompleted",
    "miniQuizCompleted",
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

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let updatedHeaders = currentHeaders.slice();
  let changed = false;

  requiredHeaders.forEach(function (header) {
    if (updatedHeaders.indexOf(header) === -1) {
      updatedHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
    sheet.getRange(1, 1, 1, updatedHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    Logger.log("🔧 Topic_Progress schema updated with missing columns");
  }

  return updatedHeaders;
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
        "miniQuizCompleted",
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
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    const headers = ensureTopicProgressSchema(sheet);
    const data = sheet.getDataRange().getValues();

    // Tìm row cho topic này
    let rowIndex = -1;
    var topicIdStr = String(topicId).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][headers.indexOf("topicId")]).trim() === topicIdStr) {
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
      } else if (progressType === "mini_quiz" && progressData.completed) {
        var mqCol = headers.indexOf("miniQuizCompleted");
        if (mqCol >= 0) newRow[mqCol] = 1;
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
      if (progressType === "mini_quiz" && progressData.completed) {
        var mqColIdx = headers.indexOf("miniQuizCompleted");
        if (mqColIdx >= 0) sheet.getRange(rowIndex, mqColIdx + 1).setValue(1);
      }

      // Update lastUpdated
      const lastUpdatedCol = headers.indexOf("lastUpdated");
      if (lastUpdatedCol >= 0)
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);

      // Check if all 4 parts completed -> update status
      // 4 phần: Bài học, Mindmap, Flashcard, Mini Quiz
      const lessonCol = headers.indexOf("lessonCompleted");
      const mindmapCol = headers.indexOf("mindmapViewed");
      const flashcardsCol = headers.indexOf("flashcardsCompleted");
      const miniQuizCol = headers.indexOf("miniQuizCompleted");

      const currentData = sheet
        .getRange(rowIndex, 1, 1, headers.length)
        .getValues()[0];
      var isChecked = function (v) {
        return v === 1 || v === true || v === "1" || v === "TRUE";
      };
      const lessonDone = lessonCol >= 0 && isChecked(currentData[lessonCol]);
      const mindmapDone = mindmapCol >= 0 && isChecked(currentData[mindmapCol]);
      const flashcardsDone =
        flashcardsCol >= 0 && isChecked(currentData[flashcardsCol]);
      const miniQuizDone =
        miniQuizCol >= 0 && isChecked(currentData[miniQuizCol]);

      if (lessonDone && mindmapDone && flashcardsDone && miniQuizDone) {
        const statusCol = headers.indexOf("status");
        const completedAtCol = headers.indexOf("completedAt");
        if (statusCol >= 0)
          sheet.getRange(rowIndex, statusCol + 1).setValue("completed");
        if (completedAtCol >= 0)
          sheet.getRange(rowIndex, completedAtCol + 1).setValue(now);

        const userEmail = getUserEmailById(userId);
        if (userEmail) {
          const learningXPResult = awardTopicXPByEvent(userEmail, {
            topicId: topicId,
            eventId: "learning_topic_completed:" + String(topicId || "").trim(),
            title:
              "Hoan thanh hoc tap chu de: " +
              String(progressData.topicTitle || topicId || ""),
            xpAmount: 100,
            source: "topic_learning_completion",
            meta: {
              progressType: progressType,
            },
          });

          if (learningXPResult && learningXPResult.awarded) {
            Logger.log(
              "✅ Learning topic XP awarded: " +
                String(topicId) +
                " (+" +
                String(learningXPResult.xpAwarded) +
                ")",
            );
          }
        }
      }
    }

    Logger.log("✅ Topic progress updated for: " + topicId);
  } catch (error) {
    Logger.log("❌ Error updating topic progress: " + error.toString());
  }
}

/**
 * Lấy tiến trình của 1 topic cụ thể cho user hiện tại
 * @param {string} topicId
 * @returns {Object} - {success, data}
 */
function getTopicProgressForWeb(topicId) {
  Logger.log("📊 getTopicProgressForWeb CALLED for topic: " + topicId);
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!userEmail)
      return { success: false, message: "Not authenticated", data: null };
    var userId = getUserIdByEmail(userEmail);
    if (!userId) return { success: true, data: null };
    var spreadsheet = getUserSpreadsheet(userId);
    if (!spreadsheet) return { success: true, data: null };
    var sheet = spreadsheet.getSheetByName("Topic_Progress");
    if (!sheet) return { success: true, data: null };

    var headers = ensureTopicProgressSchema(sheet);
    var data = sheet.getDataRange().getValues();
    var topicIdStr = String(topicId).trim();

    var mqIdx = headers.indexOf("miniQuizCompleted");

    for (var i = 1; i < data.length; i++) {
      var tidx = headers.indexOf("topicId");
      if (String(data[i][tidx]).trim() === topicIdStr) {
        var isTrue = function (v) {
          return v === 1 || v === true || v === "1" || v === "TRUE";
        };
        var lcIdx = headers.indexOf("lessonCompleted");
        var mvIdx = headers.indexOf("mindmapViewed");
        var fcIdx = headers.indexOf("flashcardsCompleted");
        return {
          success: true,
          data: {
            lessonCompleted: lcIdx >= 0 && isTrue(data[i][lcIdx]),
            mindmapViewed: mvIdx >= 0 && isTrue(data[i][mvIdx]),
            flashcardsCompleted: fcIdx >= 0 && isTrue(data[i][fcIdx]),
            miniQuizCompleted: mqIdx >= 0 && isTrue(data[i][mqIdx]),
          },
        };
      }
    }
    return { success: true, data: null };
  } catch (error) {
    Logger.log("❌ Error getTopicProgressForWeb: " + error.toString());
    return { success: false, message: error.toString(), data: null };
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

    const headers = ensureTopicProgressSchema(sheet);
    const data = sheet.getDataRange().getValues();
    const progressMap = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const topicId = row[headers.indexOf("topicId")];

      if (topicId) {
        const isChecked = function (v) {
          return v === 1 || v === true || v === "1" || v === "TRUE";
        };
        progressMap[topicId] = {
          lessonCompleted: isChecked(row[headers.indexOf("lessonCompleted")]),
          mindmapViewed: isChecked(row[headers.indexOf("mindmapViewed")]),
          flashcardsCompleted: isChecked(
            row[headers.indexOf("flashcardsCompleted")],
          ),
          quizDone: isChecked(row[headers.indexOf("quizDone")]),
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
  const total = 4; // lesson, mindmap, flashcards, miniQuiz
  const isChecked = function (v) {
    return v === 1 || v === true || v === "1" || v === "TRUE";
  };

  if (isChecked(row[headers.indexOf("lessonCompleted")])) completed++;
  if (isChecked(row[headers.indexOf("mindmapViewed")])) completed++;
  if (isChecked(row[headers.indexOf("flashcardsCompleted")])) completed++;
  if (isChecked(row[headers.indexOf("miniQuizCompleted")])) completed++;

  return Math.round((completed / total) * 100);
}

/**
 * Helper: Get userId by email
 */
function getUserIdByEmail(email) {
  try {
    // ⭐ FIX: Use DB_CONFIG.SPREADSHEET_ID instead of undefined MASTER_DB_ID
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const masterDb = SpreadsheetApp.openById(masterDbId);
    const usersSheet = masterDb.getSheetByName("Users");
    if (!usersSheet) return null;

    // ⭐ FIX: Use header-based lookup instead of hardcoded index
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailIdx = headers.indexOf("email");
    if (emailIdx === -1) return null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIdx] === email) {
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
 * Helper: Get user email by userId
 */
function getUserEmailById(userId) {
  try {
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const masterDb = SpreadsheetApp.openById(masterDbId);
    const usersSheet = masterDb.getSheetByName("Users");
    if (!usersSheet) return "";

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const userIdIdx = headers.indexOf("userId");
    const emailIdx = headers.indexOf("email");

    if (userIdIdx === -1 || emailIdx === -1) return "";

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][userIdIdx]).trim() === String(userId).trim()) {
        return String(data[i][emailIdx] || "").trim();
      }
    }

    return "";
  } catch (error) {
    Logger.log("Error getting user email by userId: " + error.toString());
    return "";
  }
}

/**
 * Helper: Get user spreadsheet
 * ⭐ FIX: Use DB_CONFIG.SPREADSHEET_ID instead of undefined MASTER_DB_ID
 * ⭐ Also use header-based email/userId lookup for robustness
 */
function getUserSpreadsheet(userId) {
  try {
    const masterDbId =
      DB_CONFIG.SPREADSHEET_ID ||
      "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const masterDb = SpreadsheetApp.openById(masterDbId);
    const usersSheet = masterDb.getSheetByName("Users");
    if (!usersSheet) return null;

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const userIdCol = headers.indexOf("userId");
    const progressSheetIdCol = headers.indexOf("progressSheetId");

    if (userIdCol === -1 || progressSheetIdCol === -1) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][userIdCol]).trim() === String(userId).trim()) {
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

/**
 * ⭐ Get quiz statistics per topic for current user
 * Returns a Map object with topicId as key and stats as value:
 * {hasPlayed, bestScore, bestPercent, playCount, lastPlayedAt}
 * @returns {object} - {success, stats: {topicId: {...}, ...}}
 */
function getQuizStatsPerTopic() {
  try {
    Logger.log("=== GET QUIZ STATS PER TOPIC ===");

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", stats: {} };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: true, stats: {} };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const quizSheet = userSpreadsheet.getSheetByName("Quiz_Results");

    if (!quizSheet) {
      return { success: true, stats: {} };
    }

    const data = quizSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, stats: {} };
    }

    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const scoreCol = headers.indexOf("score");
    const totalQuestionsCol = headers.indexOf("totalQuestions");
    const percentageCol = headers.indexOf("percentage");
    const statusCol = headers.indexOf("status");
    const completedAtCol = headers.indexOf("completedAt");

    // Aggregate stats by topicId
    const statsMap = {};

    for (let i = 1; i < data.length; i++) {
      const status = statusCol >= 0 ? data[i][statusCol] : "complete";
      // Only count completed quizzes
      if (status === "partial") continue;

      const topicId = topicIdCol >= 0 ? String(data[i][topicIdCol]).trim() : "";
      if (!topicId) continue;

      const score = scoreCol >= 0 ? parseInt(data[i][scoreCol]) || 0 : 0;
      const totalQuestions =
        totalQuestionsCol >= 0 ? parseInt(data[i][totalQuestionsCol]) || 0 : 0;
      const percentage =
        percentageCol >= 0 ? parseInt(data[i][percentageCol]) || 0 : 0;
      const completedAt = completedAtCol >= 0 ? data[i][completedAtCol] : null;

      if (!statsMap[topicId]) {
        // Initialize stats for this topic
        statsMap[topicId] = {
          hasPlayed: true,
          bestScore: score,
          bestTotal: totalQuestions,
          bestPercent: percentage,
          playCount: 1,
          lastPlayedAt: completedAt,
        };
      } else {
        // Update stats: increment playCount, update best if higher
        statsMap[topicId].playCount++;

        // Update best score if current percentage is higher
        if (percentage > statsMap[topicId].bestPercent) {
          statsMap[topicId].bestScore = score;
          statsMap[topicId].bestTotal = totalQuestions;
          statsMap[topicId].bestPercent = percentage;
        }

        // Update lastPlayedAt if more recent
        if (completedAt) {
          const currentDate = new Date(completedAt);
          const lastDate = statsMap[topicId].lastPlayedAt
            ? new Date(statsMap[topicId].lastPlayedAt)
            : new Date(0);
          if (currentDate > lastDate) {
            statsMap[topicId].lastPlayedAt = completedAt;
          }
        }
      }
    }

    Logger.log(
      "✅ getQuizStatsPerTopic: found stats for " +
        Object.keys(statsMap).length +
        " topics",
    );
    return { success: true, stats: statsMap };
  } catch (error) {
    Logger.log("❌ Error in getQuizStatsPerTopic: " + error.toString());
    return { success: false, message: error.toString(), stats: {} };
  }
}

/**
 * Get matching statistics per topic for current user.
 * Returns stats map by topicId:
 * {hasPlayed, bestScore, bestAccuracy, bestTotalPairs, playCount, lastPlayedAt}
 * @returns {object} - {success, stats: {topicId: {...}, ...}}
 */
function getMatchingStatsPerTopic() {
  try {
    Logger.log("=== GET MATCHING STATS PER TOPIC ===");

    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || userEmail === "anonymous") {
      return { success: false, message: "Not logged in", stats: {} };
    }

    const progressSheetId = getUserProgressSheetIdByEmail(userEmail);
    if (!progressSheetId) {
      return { success: true, stats: {} };
    }

    const userSpreadsheet = SpreadsheetApp.openById(progressSheetId);
    const matchingSheet = userSpreadsheet.getSheetByName("Matching_Results");

    if (!matchingSheet) {
      return { success: true, stats: {} };
    }

    const data = matchingSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, stats: {} };
    }

    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const scoreCol = headers.indexOf("score");
    const accuracyCol = headers.indexOf("accuracy");
    const totalPairsCol = headers.indexOf("totalPairs");
    const completedCol = headers.indexOf("completed");
    const playedAtCol = headers.indexOf("playedAt");

    const statsMap = {};

    for (let i = 1; i < data.length; i++) {
      const topicId = topicIdCol >= 0 ? String(data[i][topicIdCol]).trim() : "";
      if (!topicId) continue;

      // Ignore unfinished attempts when a completed flag exists.
      if (completedCol >= 0) {
        const completedVal = data[i][completedCol];
        const isCompleted =
          completedVal === true ||
          completedVal === 1 ||
          completedVal === "1" ||
          completedVal === "TRUE";
        if (!isCompleted) continue;
      }

      const score = scoreCol >= 0 ? parseInt(data[i][scoreCol], 10) || 0 : 0;
      const accuracy =
        accuracyCol >= 0 ? parseInt(data[i][accuracyCol], 10) || 0 : 0;
      const totalPairs =
        totalPairsCol >= 0 ? parseInt(data[i][totalPairsCol], 10) || 0 : 0;
      const playedAt = playedAtCol >= 0 ? data[i][playedAtCol] : null;

      if (!statsMap[topicId]) {
        statsMap[topicId] = {
          hasPlayed: true,
          bestScore: score,
          bestAccuracy: accuracy,
          bestTotalPairs: totalPairs,
          playCount: 1,
          lastPlayedAt: playedAt,
        };
      } else {
        const topicStats = statsMap[topicId];
        topicStats.playCount++;

        if (
          score > topicStats.bestScore ||
          (score === topicStats.bestScore && accuracy > topicStats.bestAccuracy)
        ) {
          topicStats.bestScore = score;
          topicStats.bestAccuracy = accuracy;
          topicStats.bestTotalPairs = totalPairs;
        }

        if (playedAt) {
          const currentDate = new Date(playedAt);
          const lastDate = topicStats.lastPlayedAt
            ? new Date(topicStats.lastPlayedAt)
            : new Date(0);
          if (currentDate > lastDate) {
            topicStats.lastPlayedAt = playedAt;
          }
        }
      }
    }

    Logger.log(
      "✅ getMatchingStatsPerTopic: found stats for " +
        Object.keys(statsMap).length +
        " topics",
    );
    return { success: true, stats: statsMap };
  } catch (error) {
    Logger.log("❌ Error in getMatchingStatsPerTopic: " + error.toString());
    return { success: false, message: error.toString(), stats: {} };
  }
}
