/**
 * adminSetup.js - Admin Setup Functions
 *
 * Các hàm setup cho Admin chạy 1 lần
 */

/**
 * Tạo Menu tùy chỉnh khi mở Google Sheet
 * Hàm này tự động chạy khi mở file Spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("🛠️ Admin Tools")
    .addItem("📄 Test Document Access", "TEST_documentAccess")
    .addSeparator()
    .addItem("📊 View All Topics", "ADMIN_viewTopics")
    .addItem("🗑️ Clear Cache", "ADMIN_clearCache")
    .addSeparator()
    .addItem("🎮 Generate Player IDs", "ADMIN_generatePlayerIds")
    .addItem("🔄 Cập nhật cột mới (Schemas)", "ADMIN_upgradeSchema")
    .addToUi();

  Logger.log("✅ Admin menu created");
}

/**
 * [ADMIN] Tự động cập nhật Schemas (thêm các cột mới vào Spreadsheet) và điền mặc định 100 XP cho các chủ đề hiện có
 */
function ADMIN_upgradeSchema() {
  try {
    Logger.log("=== BẮT ĐẦU CẬP NHẬT SCHEMAS & CỘT ĐIỂM THƯỞNG ===");
    const ss = typeof getOrCreateDatabase === "function" ? getOrCreateDatabase() : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Không thể kết nối đến Spreadsheet");
    }

    // 1. Cập nhật trực tiếp header và mở rộng cột cho bảng Topics
    const topicsSheet = ss.getSheetByName("Topics");
    if (topicsSheet) {
      const targetColumns = [
        "topicId", "title", "description", "category", "order", "iconUrl",
        "estimatedTime", "prerequisiteTopics", "isLocked", "unlockCondition",
        "createdBy", "createdAt", "updatedAt", "contentDocId", "contentDocUrl",
        "quizStatus", "xpReward", "quizXpReward", "matchingXpReward"
      ];
      
      const maxCols = topicsSheet.getMaxColumns();
      if (maxCols < targetColumns.length) {
        topicsSheet.insertColumnsAfter(maxCols, targetColumns.length - maxCols);
      }

      const headerRange = topicsSheet.getRange(1, 1, 1, targetColumns.length);
      headerRange.setValues([targetColumns]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285f4");
      headerRange.setFontColor("white");
      Logger.log("✅ Đã cập nhật header cho bảng Topics.");

      // Điền giá trị 100 XP cho các dòng chủ đề cũ
      const data = topicsSheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data[0];
        const xpCol = headers.indexOf("xpReward");
        const quizCol = headers.indexOf("quizXpReward");
        const matchingCol = headers.indexOf("matchingXpReward");

        let updatedCount = 0;
        for (let i = 1; i < data.length; i++) {
          if (xpCol >= 0 && (data[i][xpCol] === "" || data[i][xpCol] === undefined)) {
            topicsSheet.getRange(i + 1, xpCol + 1).setValue(100);
            updatedCount++;
          }
          if (quizCol >= 0 && (data[i][quizCol] === "" || data[i][quizCol] === undefined)) {
            topicsSheet.getRange(i + 1, quizCol + 1).setValue(100);
            updatedCount++;
          }
          if (matchingCol >= 0 && (data[i][matchingCol] === "" || data[i][matchingCol] === undefined)) {
            topicsSheet.getRange(i + 1, matchingCol + 1).setValue(100);
            updatedCount++;
          }
        }
        Logger.log("✅ Đã điền 100 XP cho " + updatedCount + " ô trống.");
      }
    }

    // 2. Cập nhật header cho các bảng hiện có khác
    if (typeof DB_CONFIG !== "undefined" && DB_CONFIG.SHEETS) {
      Object.values(DB_CONFIG.SHEETS).forEach(sheetConfig => {
        if (sheetConfig.name !== "Topics") {
          const sheet = ss.getSheetByName(sheetConfig.name);
          if (sheet && typeof updateSheetSchema === "function") {
            updateSheetSchema(sheet, sheetConfig);
          }
        }
      });
    }

    try {
      if (SpreadsheetApp.getActiveSpreadsheet()) {
        SpreadsheetApp.getUi().alert("✅ Cập nhật cột mới (xpReward, quizXpReward, matchingXpReward) và điền mặc định 100 XP thành công!");
      }
    } catch (e) {}
    Logger.log("=== CẬP NHẬT SCHEMAS THÀNH CÔNG ===");
    return { success: true, message: "Cập nhật Schemas thành công!" };
  } catch (error) {
    Logger.log("❌ Lỗi cập nhật schema: " + error.toString());
    try {
      if (SpreadsheetApp.getActiveSpreadsheet()) {
        SpreadsheetApp.getUi().alert("❌ Lỗi cập nhật schema: " + error.toString());
      }
    } catch (e) {}
    return { success: false, message: error.toString() };
  }
}


/**
 * [ADMIN] Generate Player IDs cho user cũ
 * Tự động quét bảng Users, những user nào chưa có playerId sẽ được tạo.
 */
function ADMIN_generatePlayerIds() {
  try {
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      SpreadsheetApp.getUi().alert("❌ Không tìm thấy bảng Users");
      return;
    }

    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    let playerIdIndex = headers.indexOf("playerId");

    // Nếu chưa có cột playerId trong DB thực tế, phải gọi updateSheetSchema
    if (playerIdIndex === -1) {
      updateSheetSchema(usersSheet, DB_CONFIG.SHEETS.USERS);
      playerIdIndex = DB_CONFIG.SHEETS.USERS.columns.indexOf("playerId");
    }

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (!data[i][playerIdIndex]) {
        usersSheet.getRange(i + 1, playerIdIndex + 1).setValue(generatePlayerId());
        count++;
      }
    }

    SpreadsheetApp.getUi().alert("✅ Thành công", `Đã tạo playerId cho ${count} người dùng.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert("❌ Lỗi", error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * [TEST] Test Document Access
 * Test xem có truy cập được Google Doc không
 */
function TEST_documentAccess() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    "📄 Test Document Access",
    "Nhập Google Doc ID để test:\n\n" + "(Ví dụ: 1abc...xyz từ URL)",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const docId = response.getResponseText().trim();

    try {
      const file = DriveApp.getFileById(docId);
      const fileName = file.getName();
      const owner = file.getOwner().getEmail();

      ui.alert(
        "✅ Truy cập thành công!",
        "Tên file: " +
          fileName +
          "\n" +
          "Chủ sở hữu: " +
          owner +
          "\n\n" +
          "Doc này có thể dùng cho hệ thống.",
        ui.ButtonSet.OK
      );

      Logger.log("✅ Document accessible: " + fileName);
      return { success: true, fileName: fileName, owner: owner };
    } catch (error) {
      ui.alert(
        "❌ Không thể truy cập!",
        "Lỗi: " +
          error.toString() +
          "\n\n" +
          "Vui lòng:\n" +
          "1. Kiểm tra Doc ID\n" +
          '2. Chia sẻ Doc với "Anyone with link can view"\n' +
          "3. Hoặc chia sẻ trực tiếp với email của Apps Script",
        ui.ButtonSet.OK
      );

      Logger.log("❌ Document access error: " + error.toString());
      return { success: false, error: error.toString() };
    }
  }
}

/**
 * [ADMIN] View All Topics
 * Hiển thị danh sách tất cả topics trong hệ thống
 */
function ADMIN_viewTopics() {
  try {
    const topics = getAllTopics();
    const ui = SpreadsheetApp.getUi();

    if (!topics || topics.length === 0) {
      ui.alert(
        "📚 Topics",
        "Chưa có topic nào trong hệ thống.",
        ui.ButtonSet.OK
      );
      return;
    }

    let message = "Danh sách Topics (" + topics.length + "):\n\n";
    topics.forEach((topic, index) => {
      message += index + 1 + ". " + topic.title + "\n";
      message += "   ID: " + topic.topicId + "\n";
      message += "   Doc ID: " + (topic.contentDocId || "Chưa có") + "\n\n";
    });

    ui.alert("📚 All Topics", message, ui.ButtonSet.OK);
    Logger.log("✅ Topics listed: " + topics.length);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      "❌ Lỗi",
      error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log("❌ Error listing topics: " + error.toString());
  }
}

/**
 * [ADMIN] Clear All Cache
 * Xóa tất cả cache để force regenerate content
 */
function ADMIN_clearCache() {
  try {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      "🗑️ Clear Cache",
      "Bạn có chắc muốn xóa tất cả cache?\n\n" +
        "Điều này sẽ buộc hệ thống tạo lại tất cả nội dung AI.",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      // Clear all cache sheets
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cacheSheets = ["AI_Content_Cache", "Topics_Cache"];
      let clearedCount = 0;

      cacheSheets.forEach((sheetName) => {
        const sheet = ss.getSheetByName(sheetName);
        if (sheet) {
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet
              .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
              .clearContent();
            clearedCount++;
            Logger.log("✅ Cleared cache: " + sheetName);
          }
        }
      });

      ui.alert(
        "✅ Thành công!",
        "Đã xóa cache từ " +
          clearedCount +
          " sheet(s).\n\n" +
          "Nội dung AI sẽ được tạo lại khi người dùng truy cập.",
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      "❌ Lỗi",
      error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log("❌ Error clearing cache: " + error.toString());
  }
}

/**
 * [DEBUG] Test getAIContent function directly
 * Chạy từ Apps Script Editor để debug
 */
function DEBUG_testGetAIContent() {
  const topicId = "TOP001";
  const contentType = "mindmap";

  Logger.log("=== DEBUG TEST getAIContent ===");
  Logger.log("Topic: " + topicId);
  Logger.log("Type: " + contentType);

  try {
    const result = getAIContent(topicId, contentType, false);

    Logger.log("=== RESULT ===");
    Logger.log("Result type: " + typeof result);
    Logger.log("Result is null: " + (result === null));

    if (result) {
      Logger.log("Result.success: " + result.success);
      Logger.log("Result.message: " + result.message);
      Logger.log("Result.data type: " + typeof result.data);
      Logger.log(
        "Result.data length: " + (result.data ? result.data.length : 0)
      );
      Logger.log(
        "Result.data preview: " +
          (result.data ? result.data.substring(0, 200) : "N/A")
      );

      // Test parse
      if (result.data && typeof result.data === "string") {
        try {
          const parsed = JSON.parse(result.data);
          Logger.log("✅ Data can be parsed!");
          Logger.log("Parsed keys: " + Object.keys(parsed).join(", "));
        } catch (e) {
          Logger.log("❌ Parse error: " + e.toString());
        }
      }
    } else {
      Logger.log("❌ Result is null/undefined");
    }

    return result;
  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
    Logger.log("Stack: " + error.stack);
    return { error: error.toString() };
  }
}

/**
 * [DEBUG] Test simple return to frontend
 * Kiểm tra xem Google Apps Script có thể trả về object không
 */
function DEBUG_testSimpleReturn() {
  Logger.log("=== TEST SIMPLE RETURN ===");

  // Test 1: Object đơn giản
  const simple = {
    success: true,
    message: "Hello from server",
    number: 42,
  };
  Logger.log("Simple object: " + JSON.stringify(simple));

  // Test 2: Object với string data
  const withData = {
    success: true,
    data: '{"test": "value", "nested": {"key": "val"}}',
    message: "With data",
  };
  Logger.log("With data: " + JSON.stringify(withData));

  return withData;
}
