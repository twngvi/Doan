/**
 * adminMindmap.js
 * Xử lý logic tạo và lưu Mindmap bằng AI cho Admin
 */

/**
 * Gọi Gemini AI để tạo Mindmap từ nội dung bài học
 * Có thể nhận thêm prompt (nếu admin yêu cầu sửa)
 */
function generateAdminMindmap(topicId, topicContent, customPrompt, userContext) {
  Logger.log("🧠 generateAdminMindmap CALLED cho topic: " + topicId);
  try {
    if (!topicContent) {
      // Nếu không truyền content trực tiếp, thử đọc từ doc
      const topicInfoRes = getTopicById(topicId);
      if (topicInfoRes && topicInfoRes.success && topicInfoRes.topic && topicInfoRes.topic.contentDocId) {
        const docResult = GeminiService.readGoogleDoc(topicInfoRes.topic.contentDocId);
        if (docResult.success) {
          topicContent = docResult.content;
        } else {
          throw new Error("Không thể đọc nội dung tài liệu bài học: " + docResult.error);
        }
      } else {
        throw new Error("Không có nội dung bài học để tạo Mindmap.");
      }
    }

    let prompt = "";
    if (customPrompt) {
      prompt = `Bạn là một chuyên gia thiết kế sơ đồ tư duy (Mindmap). 
Hãy điều chỉnh sơ đồ tư duy dưới đây theo yêu cầu của tôi: "${customPrompt}"

NỘI DUNG HIỆN TẠI HOẶC BÀI HỌC GỐC:
${topicContent}

YÊU CẦU ĐẦU RA:
- Trả về kết quả dưới định dạng Markdown thuần túy (KHÔNG đóng gói trong khối code \`\`\`markdown ... \`\`\`).
- Sử dụng cấu trúc danh sách (\`#\`, \`##\`, \`-\`, \`*\`) phù hợp với thư viện Markmap.
- Bắt đầu bằng 1 tiêu đề mức 1 (\`# Tiêu đề chính\`).
- Làm cho nội dung ngắn gọn, súc tích, dễ nhìn.
`;
    } else {
      prompt = `Bạn là một chuyên gia giáo dục và thiết kế sơ đồ tư duy (Mindmap). 
Từ nội dung bài học dưới đây, hãy tóm tắt và tạo một sơ đồ tư duy phân cấp rõ ràng.

NỘI DUNG BÀI HỌC:
${topicContent}

Chỉ trả về Markdown hợp lệ, không sử dụng khối code Markdown.

Cấu trúc bắt buộc:

# Tên bài học

## Nhánh chính 1
- Ý cấp 2
  - Ý cấp 3
  - Ý cấp 3

## Nhánh chính 2
- Ý cấp 2
  - Ý cấp 3
- Ý cấp 2

## Nhánh chính 3
- Ý cấp 2
  - Ý cấp 3

Yêu cầu:
- Có từ 4 đến 7 nhánh chính.
- Mỗi nhánh chính có từ 2 đến 5 nhánh con.
- Các nội dung quan trọng phải có thêm nhánh phụ cấp 3.
- Nội dung mỗi node ngắn gọn, tối đa 12 từ.
- Không tạo danh sách phẳng.
- Không trả về lời giải thích ngoài Markdown.
`;
    }

    const aiResult = GeminiService.callWithRetry(prompt, {
      expectJson: false,
      temperature: 0.7,
      maxTokens: 3000,
      topicId: topicId,
      contentType: "mindmap_ai_admin",
    }, userContext);

    if (!aiResult) {
      return { success: false, message: "AI trả về dữ liệu rỗng. Vui lòng thử lại." };
    }

    // Clean up markdown code block if AI mistakenly adds it
    let cleanResult = aiResult.toString().trim();
    if (cleanResult.startsWith('```markdown')) {
      cleanResult = cleanResult.replace(/^```markdown\n?/g, '');
      if (cleanResult.endsWith('```')) {
        cleanResult = cleanResult.substring(0, cleanResult.length - 3);
      }
    } else if (cleanResult.startsWith('```')) {
      cleanResult = cleanResult.replace(/^```\n?/g, '');
      if (cleanResult.endsWith('```')) {
        cleanResult = cleanResult.substring(0, cleanResult.length - 3);
      }
    }

    return { 
      success: true, 
      mindmapMarkdown: cleanResult 
    };

  } catch (error) {
    Logger.log("Lỗi generateAdminMindmap: " + error.toString());
    return { success: false, message: "Lỗi tạo Mindmap: " + error.toString() };
  }
}

/**
 * Lưu Mindmap vào AI_Content_Cache
 */
function saveAdminMindmap(topicId, mindmapMarkdown, userContext) {
  try {
    const dbId = DB_CONFIG.SPREADSHEET_ID || "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(dbId);
    let cacheSheet = ss.getSheetByName("AI_Content_Cache");
    
    if (!cacheSheet) {
      cacheSheet = ss.insertSheet("AI_Content_Cache");
      cacheSheet.appendRow(["timestamp", "topicId", "model", "contentType", "contentJson"]);
      cacheSheet.setFrozenRows(1);
    }
    
    const data = cacheSheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(topicId).trim() && 
          String(data[i][3]).trim() === "mindmap") {
        rowIndex = i + 1;
        break;
      }
    }
    
    const contentToSave = JSON.stringify({ markdown: mindmapMarkdown });
    
    if (rowIndex > -1) {
      cacheSheet.getRange(rowIndex, 1).setValue(new Date());
      cacheSheet.getRange(rowIndex, 5).setValue(contentToSave);
    } else {
      cacheSheet.appendRow([new Date(), topicId, "gemini-admin", "mindmap", contentToSave]);
    }
    
    // Update status in Topics sheet if needed
    const topicsSheet = ss.getSheetByName("Topics");
    if (topicsSheet) {
        const topicsData = topicsSheet.getDataRange().getValues();
        const headers = topicsData[0];
        const topicIdIdx = headers.indexOf("topicId");
        const mindmapStatusIdx = headers.indexOf("mindmapStatus");
        
        if (topicIdIdx > -1 && mindmapStatusIdx > -1) {
            for (let i = 1; i < topicsData.length; i++) {
                if (String(topicsData[i][topicIdIdx]).trim() === String(topicId).trim()) {
                    topicsSheet.getRange(i + 1, mindmapStatusIdx + 1).setValue("ready");
                    break;
                }
            }
        }
    }
    
    clearTopicsCache(); // Clear cache since topic status changed
    
    return { success: true, message: "Đã lưu Mindmap thành công!" };
  } catch (error) {
    Logger.log("Lỗi saveAdminMindmap: " + error.toString());
    return { success: false, message: "Lỗi lưu dữ liệu: " + error.toString() };
  }
}

/**
 * Lấy Mindmap của 1 topic (dùng cho cả User và Admin)
 */
function getTopicMindmap(topicId) {
  try {
    const dbId = DB_CONFIG.SPREADSHEET_ID || "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds";
    const ss = SpreadsheetApp.openById(dbId);
    const cacheSheet = ss.getSheetByName("AI_Content_Cache");
    
    if (!cacheSheet) {
      return { success: false, message: "Chưa có dữ liệu Mindmap." };
    }
    
    const data = cacheSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(topicId).trim() && 
          String(data[i][3]).trim() === "mindmap") {
        try {
          const parsed = JSON.parse(data[i][4]);
          return { success: true, markdown: parsed.markdown };
        } catch (e) {
          return { success: true, markdown: data[i][4] }; // Fallback if not JSON
        }
      }
    }
    
    return { success: false, message: "Không tìm thấy Mindmap cho bài học này." };
  } catch (error) {
    return { success: false, message: "Lỗi truy xuất Mindmap: " + error.toString() };
  }
}
