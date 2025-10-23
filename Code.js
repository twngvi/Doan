/**
 * Code.js - Entry Point & Main Functions
 *
 * Tác dụng:
 * - Entry point cho các function chính của hệ thống
 * - Tạo và quản lý database
 * - Thiết lập các tính năng tự động
 * - Test và debug hệ thống
 *
 * Các function chính:
 * - initializeDatabase(): Tạo database Google Sheets
 * - setupAutoIds(): Thiết lập tự động tạo ID
 * - addSampleQuestions(): Thêm dữ liệu mẫu
 * - reorderAllIds(): Sắp xếp ID
 * - fillExistingData(): Điền ID cho dữ liệu có sẵn
 */

/**
 * Function để test tạo database
 * Chạy function này để tạo Google Sheets database
 */
function initializeDatabase() {
  try {
    Logger.log("=== BẮT ĐẦU TẠO DATABASE ===");

    // Gọi function từ schema.js để tạo database
    const url = createAllSheets();

    Logger.log("=== HOÀN THÀNH TẠO DATABASE ===");
    Logger.log("Database URL: " + url);

    return {
      success: true,
      message: "Database đã được tạo thành công!",
      url: url,
    };
  } catch (error) {
    Logger.log("LỖI KHI TẠO DATABASE: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function để thêm dữ liệu câu hỏi mẫu
 */
function addSampleQuestions() {
  try {
    Logger.log("=== BẮT ĐẦU THÊM CÂU HỎI MẪU ===");

    // Thêm dữ liệu mẫu
    addSampleData();

    Logger.log("=== HOÀN THÀNH THÊM CÂU HỎI MẪU ===");

    return {
      success: true,
      message: "Đã thêm dữ liệu câu hỏi mẫu thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI THÊM CÂU HỎI: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function thiết lập hệ thống Auto-ID với trigger
 */
function setupAutoIds() {
  try {
    Logger.log("=== BẮT ĐẦU THIẾT LẬP AUTO-ID ===");

    // Thiết lập trigger tự động
    const triggerResult = setupAutoIdTrigger();

    if (!triggerResult) {
      throw new Error("Không thể thiết lập trigger");
    }

    Logger.log("=== HOÀN THÀNH THIẾT LẬP AUTO-ID ===");
    Logger.log("🎉 ID sẽ tự động tạo khi bạn nhập dữ liệu vào Google Sheets!");

    return {
      success: true,
      message:
        "Đã thiết lập Auto-ID thành công! ID sẽ tự tạo khi nhập dữ liệu.",
    };
  } catch (error) {
    Logger.log("LỖI KHI THIẾT LẬP AUTO-ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * TEST: Kiểm tra Multi-Row Auto-ID
 */
function testMultiRow() {
  return testMultiRowAutoId();
}

/**
 * Function test tính năng tạo ID tự động
 */
function testAutoIdFeature() {
  try {
    Logger.log("=== TEST AUTO-ID FEATURE ===");

    // Test ID generator functions
    testIdGenerator();

    // Test và thiết lập trigger
    const result = testAutoIdTrigger();

    Logger.log("=== HOÀN THÀNH TEST ===");

    return result;
  } catch (error) {
    Logger.log("LỖI KHI TEST AUTO-ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function để sắp xếp lại ID trong tất cả sheet
 */
function reorderAllIds() {
  try {
    Logger.log("=== BẮT ĐẦU SẮP XẾP LẠI ID ===");

    const prefixMap = {
      Users: "USR",
      Topics: "TOP",
      MCQ_Questions: "MCQ",
      Matching_Pairs: "MAT",
      Logs: "LOG",
    };

    Object.entries(prefixMap).forEach(([sheetName, prefix]) => {
      reorderSheetIds(sheetName, prefix);
    });

    Logger.log("=== HOÀN THÀNH SẮP XẾP LẠI ID ===");

    return {
      success: true,
      message: "Đã sắp xếp lại tất cả ID thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI SẮP XẾP ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function điền ID cho dữ liệu có sẵn (tùy chọn)
 */
function fillExistingData() {
  try {
    Logger.log("=== ĐIỀN ID CHO DỮ LIỆU CÓ SẴN ===");

    // Gọi function fillAllMissingIds từ schema.js
    fillAllMissingIds();

    Logger.log("=== HOÀN THÀNH ĐIỀN ID ===");

    return {
      success: true,
      message: "Đã điền ID cho dữ liệu có sẵn thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI ĐIỀN ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
/**
 * Function thiết lập hệ thống Foreign Keys và Relationships
 */
function setupRelationships() {
  try {
    Logger.log("=== BẮT ĐẦU THIẾT LẬP RELATIONSHIPS ===");

    // Thiết lập foreign key dropdowns
    const dropdownResult = setupForeignKeyDropdowns();

    if (!dropdownResult) {
      throw new Error("Không thể thiết lập foreign key dropdowns");
    }

    // Thiết lập difficulty dropdowns
    setupDifficultyDropdowns();

    // Bỏ qua highlight theo yêu cầu user
    // highlightForeignKeyColumns();

    Logger.log("=== HOÀN THÀNH THIẾT LẬP RELATIONSHIPS ===");
    Logger.log("🎉 Foreign keys và Difficulty dropdowns đã được thiết lập!");

    return {
      success: true,
      message: "Đã thiết lập Foreign Keys và Difficulty Dropdowns thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI THIẾT LẬP RELATIONSHIPS: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function test hệ thống relationships
 */
function testRelationships() {
  return testForeignKeySetup();
}

/**
 * Function refresh foreign key validations
 */
function refreshRelationships() {
  try {
    Logger.log("=== REFRESH RELATIONSHIPS ===");

    const result = refreshForeignKeyValidations();

    return {
      success: result,
      message: result
        ? "Đã refresh relationships thành công!"
        : "Lỗi khi refresh relationships",
    };
  } catch (error) {
    Logger.log("LỖI REFRESH RELATIONSHIPS: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
