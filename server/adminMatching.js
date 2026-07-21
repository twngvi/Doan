/**
 * adminMatching.js - Admin Matching Term Cards Management
 * 
 * Handles Admin flow for creating, updating, and reviewing matching cards.
 */

/**
 * Ensure Matching_Term_Cards sheet exists. Create if not.
 */
function ensureMatchingCardsSheet(ss) {
  let sheet = ss.getSheetByName("Matching_Term_Cards");
  if (!sheet) {
    sheet = ss.insertSheet("Matching_Term_Cards");
    sheet.appendRow([
      "cardId",
      "topicId",
      "topicTitle",
      "term",
      "definition",
      "shortDefinition",
      "example",
      "hint",
      "difficulty",
      "tags",
      "status",
      "isActive",
      "order",
      "source",
      "createdBy",
      "createdAt",
      "updatedAt",
      "approvedBy",
      "approvedAt"
    ]);
    sheet.setFrozenRows(1);
    
    // Formatting
    const headerRange = sheet.getRange(1, 1, 1, 19);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f3f3");
  }
  return sheet;
}


/**
 * Get topics with their matching cards stats
 * Returns array of topics for the admin matching manager
 */
function adminGetMatchingTopicsWithStats() {
  try {
    const topicsResult = typeof getAllTopicsIncludingHidden === 'function' ? getAllTopicsIncludingHidden() : getAllTopics();
    if (!topicsResult.success) {
      return topicsResult;
    }

    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    
    // Default to empty array if sheet doesn't exist
    let mcData = [];
    if (mcSheet) {
      mcData = mcSheet.getDataRange().getValues();
    }
    
    const headers = mcData.length > 0 ? mcData[0] : [];
    const topicIdCol = headers.indexOf("topicId");
    const statusCol = headers.indexOf("status");
    
    const topics = topicsResult.topics.map(topic => {
      // Calculate card stats for this topic
      let approvedCount = 0;
      let draftCount = 0;
      let totalCount = 0;
      
      if (mcData.length > 1 && topicIdCol >= 0) {
        const targetTopicId = String(topic.topicId).trim();
        for (let i = 1; i < mcData.length; i++) {
          const rowTopicId = String(mcData[i][topicIdCol]).trim();
          if (rowTopicId === targetTopicId && rowTopicId !== "") {
            const cStatus = (statusCol >= 0) ? mcData[i][statusCol] : "draft";
            // Bỏ qua thẻ đã xóa
            if (cStatus !== "deleted") {
              totalCount++;
              if (cStatus === "approved") approvedCount++;
              else if (cStatus === "draft" || cStatus === "hidden") draftCount++;
            }
          }
        }
      }
      
      return {
        ...topic,
        matchingStats: {
          total: totalCount,
          approved: approvedCount,
          draft: draftCount
        }
      };
    });
    
    return {
      success: true,
      topics: topics
    };
  } catch (error) {
    Logger.log("Error in adminGetMatchingTopicsWithStats: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get matching cards by topic ID (excluding deleted ones)
 */
function getMatchingTermCardsByTopic(topicId) {
  try {
    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    if (!mcSheet) return { success: true, cards: [] };
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, cards: [] };
    
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const statusCol = headers.indexOf("status");
    
    const cards = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === topicId) {
        const status = statusCol >= 0 ? data[i][statusCol] : "";
        if (status !== "deleted") {
          const c = {};
          headers.forEach((h, idx) => {
            let val = data[i][idx];
            if (val instanceof Date) {
              val = val.toISOString();
            }
            c[h] = val;
          });
          cards.push(c);
        }
      }
    }
    
    return { success: true, cards: cards };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Lấy thống kê số lượng thẻ hợp lệ của một Topic để kiểm tra xem đã đủ điều kiện chơi Matching chưa.
 * Trả về { total, approved, draft, hidden, validForGame, isReady }
 */
function getMatchingCardStatsByTopic(topicId) {
  try {
    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { 
        success: true, 
        stats: { total: 0, approved: 0, draft: 0, hidden: 0, validForGame: 0, isReady: false } 
      };
    }
    
    const headers = data[0];
    const idxTopicId = headers.indexOf("topicId");
    const idxStatus = headers.indexOf("status");
    const idxIsActive = headers.indexOf("isActive");
    const idxTerm = headers.indexOf("term");
    const idxDef = headers.indexOf("definition");
    
    let stats = {
      total: 0,
      approved: 0,
      draft: 0,
      hidden: 0,
      validForGame: 0,
      isReady: false
    };
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[idxTopicId] === topicId && row[idxStatus] !== "deleted") {
        stats.total++;
        const s = row[idxStatus];
        if (s === "approved") stats.approved++;
        else if (s === "draft") stats.draft++;
        else if (s === "hidden") stats.hidden++;
        
        if (s === "approved" && row[idxIsActive] === true && 
            row[idxTerm] && String(row[idxTerm]).trim() !== "" && 
            row[idxDef] && String(row[idxDef]).trim() !== "") {
          stats.validForGame++;
        }
      }
    }
    
    stats.isReady = stats.validForGame >= 10;
    
    return { success: true, stats: stats };
  } catch (error) {
    Logger.log("Error in getMatchingCardStatsByTopic: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Lấy dữ liệu trò chơi Matching từ sheet Matching_Term_Cards
 * Thay thế hàm getMatchingPairs cũ có sử dụng AI
 */
function getMatchingPairsFromCards(topicId, pairLimit, userContext) {
  Logger.log("🎮 getMatchingPairsFromCards CALLED");
  Logger.log("Args: topicId=" + topicId + ", pairLimit=" + pairLimit);
  
  try {
    if (!topicId) throw new Error("Thiếu topicId");

    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    if (!mcSheet) throw new Error("Không tìm thấy kho dữ liệu thẻ Matching.");
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error("Chủ đề này chưa đủ dữ liệu. Cần tối thiểu 15 cặp đã duyệt.");
    }
    
    const headers = data[0];
    const idxTopicId = headers.indexOf("topicId");
    const idxStatus = headers.indexOf("status");
    const idxIsActive = headers.indexOf("isActive");
    const idxTerm = headers.indexOf("term");
    const idxDef = headers.indexOf("definition");
    const idxShortDef = headers.indexOf("shortDefinition");
    const idxHint = headers.indexOf("hint");
    const idxDiff = headers.indexOf("difficulty");
    const idxCardId = headers.indexOf("cardId");
    
    let easyPairs = [];
    let mediumPairs = [];
    let hardPairs = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[idxTopicId] === topicId && row[idxStatus] === "approved" && row[idxIsActive] === true) {
        const term = String(row[idxTerm] || "").trim();
        const def = String(row[idxDef] || "").trim();
        const shortDef = String(row[idxShortDef] || "").trim();
        
        if (term !== "" && def !== "") {
          let diff = "medium";
          if (idxDiff !== -1 && row[idxDiff]) {
            const dStr = String(row[idxDiff]).toLowerCase().trim();
            if (dStr === "easy" || dStr === "dễ" || dStr === "de") diff = "easy";
            else if (dStr === "hard" || dStr === "khó" || dStr === "kho") diff = "hard";
          }

          const pairObj = {
            question: term,
            answer: shortDef !== "" ? shortDef : def, // Ưu tiên shortDefinition
            hint: idxHint !== -1 ? String(row[idxHint] || "").trim() : "",
            difficulty: diff,
            itemType: "term-definition",
            cardId: idxCardId !== -1 ? row[idxCardId] : ""
          };
          
          if (diff === "easy") easyPairs.push(pairObj);
          else if (diff === "hard") hardPairs.push(pairObj);
          else mediumPairs.push(pairObj);
        }
      }
    }
    
    // Check requirements: 10 easy, 3 medium, 2 hard
    if (easyPairs.length < 10) {
      throw new Error("Không đủ thẻ mức độ Dễ. Cần 10 thẻ, hiện có " + easyPairs.length + ".");
    }
    if (mediumPairs.length < 3) {
      throw new Error("Không đủ thẻ mức độ Trung bình. Cần 3 thẻ, hiện có " + mediumPairs.length + ".");
    }
    if (hardPairs.length < 2) {
      throw new Error("Không đủ thẻ mức độ Khó. Cần 2 thẻ, hiện có " + hardPairs.length + ".");
    }
    
    function shuffle(array) {
      for (let j = array.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        const temp = array[j];
        array[j] = array[k];
        array[k] = temp;
      }
      return array;
    }
    
    const selectedEasy = shuffle(easyPairs).slice(0, 10);
    const selectedMedium = shuffle(mediumPairs).slice(0, 3);
    const selectedHard = shuffle(hardPairs).slice(0, 2);
    
    let validPairs = selectedEasy.concat(selectedMedium, selectedHard);
    validPairs = shuffle(validPairs);
    
    return validPairs;
  } catch (error) {
    Logger.log("❌ getMatchingPairsFromCards error: " + error.toString());
    throw error;
  }
}

/**
 * Lấy số lượng thẻ hợp lệ theo từng Topic để hiển thị ngoài danh sách Matching.
 * Trả về dạng { success: true, counts: { topicId: count } }
 */
function getMatchingAllTopicsValidCounts() {
  try {
    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    if (!mcSheet) return { success: false, message: "Sheet not found" };
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, counts: {} };
    }
    
    const headers = data[0];
    const idxTopicId = headers.indexOf("topicId");
    const idxStatus = headers.indexOf("status");
    const idxIsActive = headers.indexOf("isActive");
    const idxTerm = headers.indexOf("term");
    const idxDef = headers.indexOf("definition");
    
    const counts = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[idxStatus] === "approved" && row[idxIsActive] === true && 
          row[idxTerm] && String(row[idxTerm]).trim() !== "" && 
          row[idxDef] && String(row[idxDef]).trim() !== "") {
          
        const tId = row[idxTopicId];
        counts[tId] = (counts[tId] || 0) + 1;
      }
    }
    
    return { success: true, counts: counts };
  } catch (err) {
    Logger.log("Error in getMatchingAllTopicsValidCounts: " + err.toString());
    return { success: false, message: err.toString() };
  }
}

/**
 * Create a new matching term card
 * Mặc định status = 'draft', isActive = true
 */
function createMatchingTermCard(data) {
  try {
    if (!data.topicId || !data.term || !data.definition) {
      return { success: false, message: "Thiếu thông tin bắt buộc (topicId, term, definition)." };
    }
    
    const ss = getOrCreateDatabase();
    let mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const headers = mcSheet.getDataRange().getValues()[0];
    const now = new Date();
    const adminEmail = Session.getActiveUser().getEmail() || "admin";
    
    const topicResult = getTopicById(data.topicId);
    const topicTitle = topicResult.success && topicResult.topic ? topicResult.topic.title : "";
    
    const cardId = generateId("MTC");
    const status = "draft";
    const isActive = true;
    
    // Build row data based on headers
    const rowData = headers.map(h => {
      if (h === "cardId") return cardId;
      if (h === "topicId") return data.topicId;
      if (h === "topicTitle") return topicTitle;
      if (h === "term") return data.term || "";
      if (h === "definition") return data.definition || "";
      if (h === "shortDefinition") return data.shortDefinition || "";
      if (h === "example") return data.example || "";
      if (h === "hint") return data.hint || "";
      if (h === "difficulty") return data.difficulty || "medium";
      if (h === "tags") return data.tags || "";
      if (h === "status") return status;
      if (h === "isActive") return isActive;
      if (h === "order") return data.order || 0;
      if (h === "source") return data.source || "manual";
      if (h === "createdBy") return adminEmail;
      if (h === "createdAt") return now;
      if (h === "updatedAt") return now;
      if (h === "approvedBy") return "";
      if (h === "approvedAt") return "";
      
      return "";
    });
    
    mcSheet.appendRow(rowData);
    SpreadsheetApp.flush();
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    
    return { success: true, message: "Thêm thẻ thành công", cardId: cardId };
  } catch (error) {
    Logger.log("Error in createMatchingTermCard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Update an existing matching term card
 */
function updateMatchingTermCard(cardId, data) {
  try {
    if (!cardId) {
      return { success: false, message: "Thiếu cardId." };
    }
    
    const ss = getOrCreateDatabase();
    let mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const sheetData = mcSheet.getDataRange().getValues();
    if (sheetData.length <= 1) return { success: false, message: "Sheet rỗng." };
    
    const headers = sheetData[0];
    const cIdCol = headers.indexOf("cardId");
    if (cIdCol === -1) return { success: false, message: "Lỗi nghiêm trọng: Thiếu cột 'cardId'." };
    
    const now = new Date();
    
    let rowIndex = -1;
    for (let i = 1; i < sheetData.length; i++) {
      if (String(sheetData[i][cIdCol]).trim() === String(cardId).trim()) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: "Không tìm thấy thẻ với ID cung cấp." };
    }
    
    // Build row data based on headers to update
    const currentRow = sheetData[rowIndex - 1];
    
    // Nếu truyền topicId mới thì lấy title, còn không thì dùng cũ
    let topicId = data.topicId !== undefined ? data.topicId : currentRow[headers.indexOf("topicId")];
    let topicTitle = currentRow[headers.indexOf("topicTitle")];
    if (data.topicId !== undefined && data.topicId !== currentRow[headers.indexOf("topicId")]) {
      const topicResult = getTopicById(topicId);
      topicTitle = topicResult.success && topicResult.topic ? topicResult.topic.title : "";
    }
    
    const rowData = headers.map((h, idx) => {
      if (h === "topicId" && data.topicId !== undefined) return data.topicId;
      if (h === "topicTitle" && data.topicId !== undefined) return topicTitle;
      if (h === "term" && data.term !== undefined) return data.term;
      if (h === "definition" && data.definition !== undefined) return data.definition;
      if (h === "shortDefinition" && data.shortDefinition !== undefined) return data.shortDefinition;
      if (h === "example" && data.example !== undefined) return data.example;
      if (h === "hint" && data.hint !== undefined) return data.hint;
      if (h === "difficulty" && data.difficulty !== undefined) return data.difficulty;
      if (h === "tags" && data.tags !== undefined) return data.tags;
      if (h === "order" && data.order !== undefined) return data.order;
      if (h === "source" && data.source !== undefined) return data.source;
      
      // Cho phép cập nhật status và isActive nếu truyền vào, nhưng thường sẽ dùng approve/delete/hide riêng
      if (h === "status" && data.status !== undefined) return data.status;
      if (h === "isActive" && data.isActive !== undefined) return data.isActive;
      
      if (h === "updatedAt") return now;
      
      // Giữ nguyên các giá trị còn lại
      return currentRow[idx];
    });
    
    mcSheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
    SpreadsheetApp.flush();
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    
    return { success: true, message: "Cập nhật thẻ thành công" };
  } catch (error) {
    Logger.log("Error in updateMatchingTermCard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Bulk save matching term cards (create or update)
 */
function bulkSaveMatchingTermCards(cards) {
  try {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return { success: false, message: "Không có thẻ nào để lưu." };
    }
    
    const ss = getOrCreateDatabase();
    let mcSheet = ensureMatchingCardsSheet(ss);
    
    const sheetData = mcSheet.getDataRange().getValues();
    if (sheetData.length === 0) return { success: false, message: "Sheet rỗng." };
    const headers = sheetData[0];
    const cIdCol = headers.indexOf("cardId");
    
    if (cIdCol === -1) return { success: false, message: "Lỗi nghiêm trọng: Thiếu cột 'cardId'." };
    
    const now = new Date();
    
    // Create a map of existing card rows for faster lookup
    const existingCardsMap = new Map();
    for (let i = 1; i < sheetData.length; i++) {
      existingCardsMap.set(String(sheetData[i][cIdCol]).trim(), i + 1); // 1-based index
    }
    
    let createdCount = 0;
    let updatedCount = 0;
    
    const rowsToUpdate = [];
    const rowsToAppend = [];
    
    cards.forEach(card => {
      if (!card.term || !card.definition) return; // Skip invalid
      
      const isNew = !card.cardId || String(card.cardId).startsWith("TEMP_");
      
      if (isNew) {
        const newCardId = generateId("MTC");
        
        let topicTitle = card.topicTitle || "";
        if (!topicTitle && card.topicId) {
           const topicResult = getTopicById(card.topicId);
           topicTitle = topicResult.success && topicResult.topic ? topicResult.topic.title : "";
        }
        
        const rowData = headers.map(h => {
          if (h === "cardId") return newCardId;
          if (h === "topicId") return card.topicId || "";
          if (h === "topicTitle") return topicTitle;
          if (h === "term") return card.term || "";
          if (h === "definition") return card.definition || "";
          if (h === "shortDefinition") return card.shortDefinition || "";
          if (h === "example") return card.example || "";
          if (h === "hint") return card.hint || "";
          if (h === "difficulty") return card.difficulty || "medium";
          if (h === "tags") return card.tags || "";
          if (h === "status") return card.status || "draft";
          if (h === "isActive") return card.isActive !== undefined ? card.isActive : true;
          if (h === "order") return card.order || 0;
          if (h === "source") return card.source || "manual";
          if (h === "createdBy") return ""; 
          if (h === "createdAt") return now;
          if (h === "updatedAt") return now;
          if (h === "approvedBy") return "";
          if (h === "approvedAt") return "";
          return "";
        });
        
        rowsToAppend.push(rowData);
        createdCount++;
      } else {
        const rowIndex = existingCardsMap.get(String(card.cardId).trim());
        if (rowIndex) {
          const currentRow = sheetData[rowIndex - 1];
          let topicTitle = currentRow[headers.indexOf("topicTitle")];
          
          if (card.topicId !== undefined && card.topicId !== currentRow[headers.indexOf("topicId")]) {
            const topicResult = getTopicById(card.topicId);
            topicTitle = topicResult.success && topicResult.topic ? topicResult.topic.title : "";
          }
          
          const rowData = headers.map((h, idx) => {
            if (h === "topicId" && card.topicId !== undefined) return card.topicId;
            if (h === "topicTitle" && card.topicId !== undefined) return topicTitle;
            if (h === "term" && card.term !== undefined) return card.term;
            if (h === "definition" && card.definition !== undefined) return card.definition;
            if (h === "shortDefinition" && card.shortDefinition !== undefined) return card.shortDefinition;
            if (h === "example" && card.example !== undefined) return card.example;
            if (h === "hint" && card.hint !== undefined) return card.hint;
            if (h === "difficulty" && card.difficulty !== undefined) return card.difficulty;
            if (h === "tags" && card.tags !== undefined) return card.tags;
            if (h === "order" && card.order !== undefined) return card.order;
            if (h === "source" && card.source !== undefined) return card.source;
            if (h === "status" && card.status !== undefined) return card.status;
            if (h === "isActive" && card.isActive !== undefined) return card.isActive;
            if (h === "updatedAt") return now;
            return currentRow[idx];
          });
          
          rowsToUpdate.push({ index: rowIndex, data: rowData });
          updatedCount++;
        }
      }
    });
    
    // Update existing rows
    rowsToUpdate.forEach(item => {
      mcSheet.getRange(item.index, 1, 1, headers.length).setValues([item.data]);
    });
    
    // Append new rows
    if (rowsToAppend.length > 0) {
      mcSheet.getRange(sheetData.length + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
    
    SpreadsheetApp.flush();
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    
    return { success: true, message: `Đã lưu \${createdCount} thẻ mới và cập nhật \${updatedCount} thẻ.`, createdCount, updatedCount };
  } catch (error) {
    Logger.log("Error in bulkSaveMatchingTermCards: " + error.toString());
    return { success: false, message: error.toString() };
  }
}


/**
 * Soft delete matching term cards
 * Đổi status = 'deleted', isActive = false
 * Hỗ trợ nhận một cardId hoặc mảng cardIds
 */
function deleteMatchingTermCard(cardIds) {
  try {
    if (!cardIds) return { success: true };
    const idsToProcess = Array.isArray(cardIds) ? cardIds : [cardIds];
    if (idsToProcess.length === 0) return { success: true };
    
    const strCardIds = idsToProcess.map(id => String(id).trim());
    
    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true };
    
    const headers = data[0];
    const cIdCol = headers.indexOf("cardId");
    const statusCol = headers.indexOf("status");
    const isActiveCol = headers.indexOf("isActive");
    const updatedAtCol = headers.indexOf("updatedAt");
    
    if (cIdCol === -1 || statusCol === -1 || isActiveCol === -1) {
      return { success: false, message: "Lỗi cấu trúc Database" };
    }
    
    const now = new Date();
    let updatedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][cIdCol]) {
        const id = String(data[i][cIdCol]).trim();
        if (strCardIds.includes(id)) {
          mcSheet.getRange(i + 1, statusCol + 1).setValue("deleted");
          mcSheet.getRange(i + 1, isActiveCol + 1).setValue(false);
          if (updatedAtCol !== -1) {
            mcSheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
          }
          updatedCount++;
        }
      }
    }
    
    SpreadsheetApp.flush();
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    return { success: true, message: `Đã xóa ${updatedCount} thẻ`, updatedCount: updatedCount };
  } catch (error) {
    Logger.log("Error in deleteMatchingTermCard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Hide matching term cards
 * Đổi status = 'hidden', isActive = false
 */
function hideMatchingTermCard(cardIds) {
  try {
    if (!cardIds) return { success: true };
    const idsToProcess = Array.isArray(cardIds) ? cardIds : [cardIds];
    if (idsToProcess.length === 0) return { success: true };
    
    const strCardIds = idsToProcess.map(id => String(id).trim());
    
    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true };
    
    const headers = data[0];
    const cIdCol = headers.indexOf("cardId");
    const statusCol = headers.indexOf("status");
    const isActiveCol = headers.indexOf("isActive");
    const updatedAtCol = headers.indexOf("updatedAt");
    
    if (cIdCol === -1 || statusCol === -1 || isActiveCol === -1) {
      return { success: false, message: "Lỗi cấu trúc Database" };
    }
    
    const now = new Date();
    let updatedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][cIdCol]) {
        const id = String(data[i][cIdCol]).trim();
        if (strCardIds.includes(id)) {
          mcSheet.getRange(i + 1, statusCol + 1).setValue("hidden");
          mcSheet.getRange(i + 1, isActiveCol + 1).setValue(false);
          if (updatedAtCol !== -1) {
            mcSheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
          }
          updatedCount++;
        }
      }
    }
    
    SpreadsheetApp.flush();
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    return { success: true, message: `Đã ẩn ${updatedCount} thẻ`, updatedCount: updatedCount };
  } catch (error) {
    Logger.log("Error in hideMatchingTermCard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Approve matching term cards
 * Đổi status = 'approved', isActive = true, approvedAt = now
 */
function approveMatchingTermCards(cardIds) {
  try {
    if (!cardIds) return { success: true };
    const idsToProcess = Array.isArray(cardIds) ? cardIds : [cardIds];
    if (idsToProcess.length === 0) return { success: true };
    
    const strCardIds = idsToProcess.map(id => String(id).trim());
    
    const ss = getOrCreateDatabase();
    const mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const data = mcSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true };
    
    const headers = data[0];
    const cIdCol = headers.indexOf("cardId");
    const statusCol = headers.indexOf("status");
    const isActiveCol = headers.indexOf("isActive");
    const updatedAtCol = headers.indexOf("updatedAt");
    const approvedAtCol = headers.indexOf("approvedAt");
    const approvedByCol = headers.indexOf("approvedBy");
    
    if (cIdCol === -1 || statusCol === -1 || isActiveCol === -1) {
      return { success: false, message: "Lỗi cấu trúc Database" };
    }
    
    const now = new Date();
    const adminEmail = Session.getActiveUser().getEmail() || "admin";
    let updatedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][cIdCol]) {
        const id = String(data[i][cIdCol]).trim();
        if (strCardIds.includes(id)) {
          mcSheet.getRange(i + 1, statusCol + 1).setValue("approved");
          mcSheet.getRange(i + 1, isActiveCol + 1).setValue(true);
          
          if (updatedAtCol !== -1) mcSheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
          if (approvedAtCol !== -1) mcSheet.getRange(i + 1, approvedAtCol + 1).setValue(now);
          if (approvedByCol !== -1) mcSheet.getRange(i + 1, approvedByCol + 1).setValue(adminEmail);
          
          updatedCount++;
        }
      }
    }
    
    SpreadsheetApp.flush();
    if (typeof clearTopicsCache === 'function') clearTopicsCache();
    return { success: true, message: `Đã duyệt ${updatedCount} thẻ`, updatedCount: updatedCount };
  } catch (error) {
    Logger.log("Error in approveMatchingTermCards: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Generate Matching Term Cards via AI
 */
function adminGenerateMatchingCardsByAI(topicId) {
  try {
    // 1. Get Topic Info
    const topicResult = getTopicById(topicId);
    if (!topicResult.success || !topicResult.topic) {
      return { success: false, message: "Topic not found" };
    }
    const topic = topicResult.topic;
    
    if (!topic.contentDocId) {
      return { success: false, message: "Topic chưa có nội dung (contentDocId). Vui lòng cấu hình tài liệu học tập trước." };
    }

    const userId = Session.getActiveUser().getEmail() || "admin";
    const userContext = { userId: userId, email: userId };
    
    // 2. Get existing terms to prevent duplicates
    const existingCardsResult = getMatchingTermCardsByTopic(topicId);
    let existingTermsText = "Không có thẻ cũ nào.";
    if (existingCardsResult.success && existingCardsResult.cards && existingCardsResult.cards.length > 0) {
      existingTermsText = existingCardsResult.cards
        .filter(c => c.term)
        .map(c => `- ${c.term}`)
        .join("\n");
    }

    // 3. Read Google Doc
    const docResult = GeminiService.readGoogleDoc(topic.contentDocId);
    if (!docResult.success) {
      return { success: false, message: "Không thể đọc tài liệu: " + docResult.error };
    }
    
    // 4. Call Gemini AI directly with a custom prompt
    const prompt = `Bạn là chuyên gia giáo dục. Từ nội dung bài học sau đây, hãy trích xuất 30 thuật ngữ/khái niệm quan trọng nhất và tạo thành các thẻ ghép (matching cards).

=== NỘI DUNG BÀI HỌC ===
${docResult.content}
=== KẾT THÚC ===

KHÔNG tạo các thuật ngữ trùng lặp với danh sách đã có sau đây:
${existingTermsText}

Trả về CHÍNH XÁC định dạng JSON sau:
{
  "cards": [
    {
      "term": "Thuật ngữ ngắn gọn (1-5 từ)",
      "definition": "Định nghĩa chi tiết",
      "shortDefinition": "Định nghĩa ngắn gọn (1 câu)",
      "example": "Ví dụ minh họa",
      "hint": "Gợi ý để người chơi dễ đoán",
      "difficulty": "easy|medium|hard",
      "tags": "tag1, tag2"
    }
  ]
}

YÊU CẦU QUAN TRỌNG:
- LUÔN LUÔN cố gắng tạo CHÍNH XÁC 30 thẻ chất lượng nhất. Nếu không đủ nội dung để tạo 30 thẻ mới, hãy tạo tối đa có thể nhưng TUYỆT ĐỐI KHÔNG TRÙNG LẶP. NỘI DUNG GIỮA CÁC THẺ CŨNG KHÔNG ĐƯỢC TRÙNG NHAU.
- PHẢI phân bổ độ khó theo đúng tỷ lệ: 70% thẻ "easy", 20% thẻ "medium", 10% thẻ "hard". (Ví dụ: tạo 30 thẻ thì cần 21 thẻ easy, 6 thẻ medium, 3 thẻ hard).
- term: Là cụm từ cốt lõi, không diễn giải dài dòng.
- CHỈ trả về JSON hợp lệ, không có markdown text dư thừa.`;

    const aiResult = GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.7,
      maxTokens: 5000,
      topicId: topicId,
      contentType: "matching_cards_ai_admin",
    }, userContext);

    if (!aiResult || !aiResult.cards || !Array.isArray(aiResult.cards)) {
      return { success: false, message: "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại." };
    }

    const existingTermsSet = new Set();
    if (existingCardsResult.success && existingCardsResult.cards) {
      existingCardsResult.cards.forEach(c => {
        if (c.term) existingTermsSet.add(c.term.toLowerCase().trim());
      });
    }

    const newCards = aiResult.cards.filter(c => c.term && !existingTermsSet.has(c.term.toLowerCase().trim()));

    if (newCards.length === 0) {
      return { success: false, message: "Không thể tạo thêm thẻ mới từ tài liệu này (đã cạn kiệt thuật ngữ bài học hoặc toàn bộ bị trùng lặp)." };
    }

    // 5. Save to database
    const ss = getOrCreateDatabase();
    let mcSheet = ensureMatchingCardsSheet(ss);
    
    
    const headers = mcSheet.getDataRange().getValues()[0];
    const now = new Date();
    const rowsToAppend = [];
    
    newCards.forEach(c => {
      const cardId = generateId("MTC");
      
      const rowData = headers.map(h => {
        if (h === "cardId") return cardId;
        if (h === "topicId") return topicId;
        if (h === "topicTitle") return topic.title;
        if (h === "term") return c.term || "";
        if (h === "definition") return c.definition || "";
        if (h === "shortDefinition") return c.shortDefinition || "";
        if (h === "example") return c.example || "";
        if (h === "hint") return c.hint || "";
        if (h === "difficulty") {
          let diff = c.difficulty || c.Difficulty || c.DIFFICULTY || "medium";
          return typeof diff === 'string' ? diff.toLowerCase() : "medium";
        }
        if (h === "tags") return c.tags || "";
        if (h === "status") return "draft";
        if (h === "isActive") return false;
        if (h === "order") return 0;
        if (h === "source") return "ai";
        if (h === "createdBy") return "AI";
        if (h === "createdAt") return now;
        if (h === "updatedAt") return now;
        if (h === "approvedBy") return "";
        if (h === "approvedAt") return "";
        
        return "";
      });
      
      rowsToAppend.push(rowData);
    });
    
    if (rowsToAppend.length > 0) {
      // Dùng setValues để insert hàng loạt nhanh hơn nếu cần, nhưng appendRow cho đơn giản (số lượng nhỏ 15 dòng)
      // Thực ra gọi setValues sẽ nhanh hơn rất nhiều
      mcSheet.getRange(mcSheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      SpreadsheetApp.flush();
      if (typeof clearTopicsCache === 'function') clearTopicsCache();
    }
    
    return { success: true, message: `Đã tạo ${rowsToAppend.length} thẻ bằng AI.`, count: rowsToAppend.length };
  } catch (error) {
    Logger.log("Error in adminGenerateMatchingCardsByAI: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Lấy HTML cho trang Quản lý thẻ Matching
 */
function getMatchingCardsManagerHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/matchingCards/matching_cards_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/matchingCards/matching_cards_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/matchingCards/matching_cards_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error loading Matching Cards Manager: " + error.toString());
    return `<div style="padding:40px;text-align:center;color:#d93025;">
      <h3>Lỗi tải trang Quản lý thẻ Matching</h3>
      <p>${error.toString()}</p>
    </div>`;
  }
}
