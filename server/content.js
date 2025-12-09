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
          "Lỗi: Không tìm thấy tài liệu. Vui lòng kiểm tra Doc ID.";
      } else if (responseCode === 403) {
        errorMessage =
          "Lỗi: Không có quyền truy cập tài liệu. Vui lòng chia sẻ Doc với 'Anyone with link'.";
      } else if (responseCode === 401) {
        errorMessage = "Lỗi: Chưa được xác thực. Vui lòng thử lại.";
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
