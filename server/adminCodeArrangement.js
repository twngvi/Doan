/**
 * adminCodeArrangement.js - Admin Code Arrangement Management
 * 
 * Handles Admin flow for managing Code Arrangement game.
 */

/**
 * Get HTML for Code Arrangement Manager page (called from frontend)
 */
function getCodeArrangementHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/codeArrangement/code_arrangement_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/codeArrangement/code_arrangement_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/codeArrangement/code_arrangement_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error loading Code Arrangement Manager: " + error.toString());
    return `<div style="padding:40px;text-align:center;color:#d93025;">
      <h3>Lỗi tải trang Quản lý Sắp xếp Code</h3>
      <p>${error.toString()}</p>
    </div>`;
  }
}

/**
 * Lấy danh sách câu hỏi Code Arrangement
 */
function adminGetCodeArrangements() {
  try {
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: true, data: [] };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: [] };
    
    const headers = data[0];
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, idx) => {
        let val = data[i][idx];
        if (val instanceof Date) {
          val = val.toISOString();
        }
        row[h] = val;
      });
      results.push(row);
    }
    
    // Sort theo orderIndex nếu có
    if (headers.indexOf("orderIndex") !== -1) {
      results.sort((a, b) => {
        const orderA = parseInt(a.orderIndex, 10);
        const orderB = parseInt(b.orderIndex, 10);
        return (isNaN(orderA) ? 999999 : orderA) - (isNaN(orderB) ? 999999 : orderB);
      });
    }
    
    return { success: true, data: results };
  } catch (error) {
    Logger.log("Error in adminGetCodeArrangements: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Lưu hoặc cập nhật câu hỏi Code Arrangement
 */
function adminSaveCodeArrangement(payload) {
  try {
    const ss = getOrCreateDatabase();
    let sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Sheet Code_Arrangement không tồn tại" };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const now = new Date();
    
    let qIdCol = headers.indexOf("arrangementId");
    if (qIdCol === -1) return { success: false, message: "Lỗi cấu trúc CSDL: thiếu arrangementId" };
    
    const isNew = !payload.arrangementId;
    const arrangementId = isNew ? generateId("ARR") : payload.arrangementId;
    
    let slicedCodeBlocks = payload.slicedCodeBlocks || "[]";
    
    // Tìm rowIndex nếu là update
    let rowIndex = -1;
    if (!isNew) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][qIdCol]).trim() === arrangementId) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    // Đọc trạng thái cũ
    let oldPublishedData = "";
    let oldStatus = "draft";
    let oldCreatedAt = now;
    
    if (!isNew && rowIndex > -1) {
      const pubCol = headers.indexOf("publishedData");
      const statusCol = headers.indexOf("status");
      const createdCol = headers.indexOf("createdAt");
      
      oldPublishedData = pubCol > -1 ? data[rowIndex-1][pubCol] || "" : "";
      oldStatus = statusCol > -1 ? data[rowIndex-1][statusCol] || "draft" : "draft";
      oldCreatedAt = createdCol > -1 ? data[rowIndex-1][createdCol] || now : now;
    }
    
    // Giai đoạn 5: Tạo payload JSON để lưu
    const snapshot = {
      arrangementId: arrangementId,
      title: payload.title || "",
      description: payload.description || "",
      topicId: payload.topicId || "",
      programmingLanguage: payload.programmingLanguage || "javascript",
      difficulty: payload.difficulty || "medium",
      status: payload.status || "published",
      originalCode: payload.originalCode || "",
      slicedCodeBlocks: slicedCodeBlocks
    };
    
    const draftDataStr = JSON.stringify(snapshot);
    const newPublishedData = (payload.action === 'publish') ? draftDataStr : oldPublishedData;
    const newStatus = (payload.action === 'publish') ? (payload.status || "published") : oldStatus;
    
    const rowData = headers.map(h => {
      if (h === "arrangementId") return arrangementId;
      if (h === "title") return payload.title || "";
      if (h === "description") return payload.description || "";
      if (h === "topicId") return payload.topicId || "";
      if (h === "programmingLanguage") return payload.programmingLanguage || "javascript";
      if (h === "difficulty") return payload.difficulty || "medium";
      if (h === "status") return newStatus;
      if (h === "originalCode") return payload.originalCode || "";
      if (h === "slicedCodeBlocks") return slicedCodeBlocks;
      if (h === "draftData") return draftDataStr;
      if (h === "publishedData") return newPublishedData;
      if (h === "createdAt") return isNew ? now : oldCreatedAt;
      if (h === "updatedAt") return now;
      return "";
    });
    
    if (isNew || rowIndex === -1) {
      sheet.appendRow(rowData);
    } else {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
    }
    
    SpreadsheetApp.flush();
    return { success: true, message: "Đã lưu thành công", data: rowData, arrangementId: arrangementId };
  } catch (error) {
    Logger.log("Error in adminSaveCodeArrangement: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Xóa câu hỏi Code Arrangement
 */
function adminDeleteCodeArrangement(arrangementId) {
  try {
    if (!arrangementId) return { success: false, message: "Thiếu ID câu hỏi" };
    
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Sheet Code_Arrangement không tồn tại" };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const qIdCol = headers.indexOf("arrangementId");
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][qIdCol]).trim() === String(arrangementId).trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Đã xóa thành công" };
      }
    }
    
    return { success: false, message: "Không tìm thấy câu hỏi để xóa" };
  } catch (error) {
    Logger.log("Error in adminDeleteCodeArrangement: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Ẩn / Hiện (chuyển trạng thái) câu hỏi Code Arrangement
 */
function adminToggleCodeArrangementStatus(arrangementId, targetStatus) {
  try {
    if (!arrangementId) return { success: false, message: "Thiếu ID câu hỏi" };
    const newStatus = targetStatus || "hidden";
    
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Sheet Code_Arrangement không tồn tại" };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const qIdCol = headers.indexOf("arrangementId");
    const statusCol = headers.indexOf("status");
    const updatedAtCol = headers.indexOf("updatedAt");
    
    if (qIdCol === -1 || statusCol === -1) {
      return { success: false, message: "Lỗi cấu trúc CSDL: thiếu arrangementId hoặc status" };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][qIdCol]).trim() === String(arrangementId).trim()) {
        sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
        if (updatedAtCol > -1) {
          sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date());
        }
        SpreadsheetApp.flush();
        return { success: true, message: `Đã chuyển trạng thái thành công`, newStatus: newStatus };
      }
    }
    
    return { success: false, message: "Không tìm thấy câu hỏi" };
  } catch (error) {
    Logger.log("Error in adminToggleCodeArrangementStatus: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Sắp xếp lại thứ tự câu hỏi Code Arrangement theo danh sách ID
 */
function adminReorderCodeArrangements(orderedIds) {
  try {
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { success: false, message: "Danh sách ID không hợp lệ" };
    }
    
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Sheet Code_Arrangement không tồn tại" };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, message: "Không có dữ liệu để sắp xếp" };
    
    let headers = data[0];
    let qIdCol = headers.indexOf("arrangementId");
    if (qIdCol === -1) return { success: false, message: "Thiếu cột arrangementId" };
    
    // Kiểm tra hoặc bổ sung cột orderIndex
    let orderCol = headers.indexOf("orderIndex");
    if (orderCol === -1) {
      orderCol = headers.length;
      headers.push("orderIndex");
      sheet.getRange(1, orderCol + 1).setValue("orderIndex");
    }
    
    const rows = data.slice(1);
    rows.forEach(row => {
      // Nếu row chưa có đủ cột do mới thêm orderIndex
      while (row.length < headers.length) row.push("");
      const id = String(row[qIdCol]).trim();
      const idx = orderedIds.indexOf(id);
      row[orderCol] = idx !== -1 ? (idx + 1) : (orderedIds.length + 999);
    });
    
    // Sắp xếp lại vật lý các dòng theo orderIndex mới
    rows.sort((a, b) => {
      return (parseInt(a[orderCol], 10) || 999999) - (parseInt(b[orderCol], 10) || 999999);
    });
    
    // Ghi lại toàn bộ dữ liệu đã sắp xếp vào Sheet
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    SpreadsheetApp.flush();
    
    return { success: true, message: "Đã đồng bộ thứ tự sắp xếp thành công" };
  } catch (error) {
    Logger.log("Error in adminReorderCodeArrangements: " + error.toString());
    return { success: false, message: error.toString() };
  }
}


