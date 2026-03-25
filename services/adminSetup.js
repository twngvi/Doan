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
    .addToUi();

  Logger.log("✅ Admin menu created");
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
