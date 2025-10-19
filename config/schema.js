/**
 * schema.js - Database Schema Configuration
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc dữ liệu cho Google Sheets làm database
 * - Khai báo tên các sheet và mapping với entity
 * - Định nghĩa các cột, kiểu dữ liệu, và ràng buộc
 * - Cấu hình relationship giữa các bảng
 *
 * Các sheet chính:
 * - Users: Thông tin người dùng
 * - Topics: Chủ đề học tập
 * - MCQ_Questions: Câu hỏi trắc nghiệm
 * - Matching_Pairs: Cặp ghép nối
 * - Logs: Nhật ký hoạt động
 *
 * Lưu ý: User_Progress sẽ được tạo riêng theo userId, không nằm trong DB_Master
 */

// Cấu hình database
const DB_CONFIG = {
  SPREADSHEET_NAME: "DB_Master", // Tên file Google Sheets

  // Định nghĩa các sheet và cột
  SHEETS: {
    USERS: {
      name: "Users",
      columns: [
        "userId",
        "username",
        "email",
        "passwordHash",
        "fullName",
        "role",
        "createdAt",
        "lastLogin",
        "isActive",
      ],
    },

    TOPICS: {
      name: "Topics",
      columns: [
        "topicId",
        "title",
        "description",
        "category",
        "difficulty",
        "createdBy",
        "createdAt",
        "isPublic",
        "tags",
        "viewCount",
      ],
    },

    MCQ_QUESTIONS: {
      name: "MCQ_Questions",
      columns: [
        "questionId",
        "topicId",
        "questionText",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
        "correctAnswer",
        "explanation",
        "difficulty",
        "points",
        "createdBy",
        "usageCount",
      ],
    },

    MATCHING_PAIRS: {
      name: "Matching_Pairs",
      columns: [
        "pairId",
        "topicId",
        "leftItem",
        "rightItem",
        "itemType",
        "difficulty",
        "hints",
        "createdBy",
        "usageCount",
        "successRate",
      ],
    },

    LOGS: {
      name: "Logs",
      columns: [
        "logId",
        "timestamp",
        "level",
        "category",
        "userId",
        "action",
        "details",
        "ipAddress",
        "userAgent",
        "sessionId",
      ],
    },
  },
};

/**
 * Tạo hoặc lấy Google Spreadsheet
 */
function getOrCreateDatabase() {
  try {
    // Tìm file DB_Master đã tồn tại
    const files = DriveApp.getFilesByName(DB_CONFIG.SPREADSHEET_NAME);

    if (files.hasNext()) {
      const file = files.next();
      Logger.log("Đã tìm thấy database: " + file.getId());
      return SpreadsheetApp.openById(file.getId());
    } else {
      // Tạo mới nếu chưa có
      const spreadsheet = SpreadsheetApp.create(DB_CONFIG.SPREADSHEET_NAME);
      Logger.log("Đã tạo database mới: " + spreadsheet.getId());
      return spreadsheet;
    }
  } catch (error) {
    Logger.log("Lỗi khi tạo/mở database: " + error.toString());
    throw error;
  }
}

/**
 * Tạo tất cả các sheet theo schema
 */
function createAllSheets() {
  try {
    const spreadsheet = getOrCreateDatabase();

    // Xóa sheet mặc định nếu có
    const defaultSheet = spreadsheet.getSheetByName("Sheet1");
    if (defaultSheet) {
      spreadsheet.deleteSheet(defaultSheet);
    }

    // Tạo từng sheet
    Object.values(DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      createSheet(spreadsheet, sheetConfig);
    });

    Logger.log("Đã tạo thành công tất cả các sheet!");
    return spreadsheet.getUrl();
  } catch (error) {
    Logger.log("Lỗi khi tạo sheets: " + error.toString());
    throw error;
  }
}

/**
 * Tạo một sheet với header
 */
function createSheet(spreadsheet, sheetConfig) {
  try {
    // Kiểm tra sheet đã tồn tại chưa
    let sheet = spreadsheet.getSheetByName(sheetConfig.name);

    if (!sheet) {
      // Tạo sheet mới
      sheet = spreadsheet.insertSheet(sheetConfig.name);
      Logger.log("Đã tạo sheet: " + sheetConfig.name);
    } else {
      Logger.log("Sheet đã tồn tại: " + sheetConfig.name);
      return sheet;
    }

    // Thêm header row
    const headerRange = sheet.getRange(1, 1, 1, sheetConfig.columns.length);
    headerRange.setValues([sheetConfig.columns]);

    // Format header
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");

    // Auto resize columns
    sheet.autoResizeColumns(1, sheetConfig.columns.length);

    // Freeze header row
    sheet.setFrozenRows(1);

    return sheet;
  } catch (error) {
    Logger.log(
      "Lỗi khi tạo sheet " + sheetConfig.name + ": " + error.toString()
    );
    throw error;
  }
}

/**
 * Lấy sheet theo tên
 */
function getSheet(sheetName) {
  try {
    const spreadsheet = getOrCreateDatabase();
    return spreadsheet.getSheetByName(sheetName);
  } catch (error) {
    Logger.log("Lỗi khi lấy sheet " + sheetName + ": " + error.toString());
    return null;
  }
}

/**
 * Test function để tạo database
 */
function testCreateDatabase() {
  try {
    const url = createAllSheets();
    Logger.log("Database đã được tạo thành công!");
    Logger.log("URL: " + url);

    // Test thêm dữ liệu mẫu
    addSampleData();
  } catch (error) {
    Logger.log("Lỗi test: " + error.toString());
  }
}

/**
 * Thêm dữ liệu mẫu để test
 */
function addSampleData() {
  try {
    // Thêm sample topics
    const topicsSheet = getSheet(DB_CONFIG.SHEETS.TOPICS.name);
    if (topicsSheet) {
      const sampleTopics = [
        [
          "TOPIC001",
          "Toán học cơ bản",
          "Các phép tính cơ bản",
          "Math",
          "Easy",
          "ADMIN",
          new Date().toISOString(),
          true,
          "math,basic",
          0,
        ],
        [
          "TOPIC002",
          "Tiếng Anh giao tiếp",
          "Từ vựng và ngữ pháp cơ bản",
          "English",
          "Medium",
          "ADMIN",
          new Date().toISOString(),
          true,
          "english,vocabulary",
          0,
        ],
      ];

      topicsSheet
        .getRange(2, 1, sampleTopics.length, sampleTopics[0].length)
        .setValues(sampleTopics);
      Logger.log("Đã thêm dữ liệu mẫu Topics");
    }

    // Thêm sample MCQ questions
    const mcqSheet = getSheet(DB_CONFIG.SHEETS.MCQ_QUESTIONS.name);
    if (mcqSheet) {
      const sampleQuestions = [
        [
          "Q001",
          "TOPIC001",
          "2 + 2 = ?",
          "3",
          "4",
          "5",
          "6",
          "B",
          "Phép cộng cơ bản",
          "Easy",
          10,
          "ADMIN",
          0,
        ],
        [
          "Q002",
          "TOPIC002",
          "Hello nghĩa là gì?",
          "Tạm biệt",
          "Xin chào",
          "Cảm ơn",
          "Xin lỗi",
          "B",
          "Từ chào hỏi cơ bản",
          "Easy",
          5,
          "ADMIN",
          0,
        ],
      ];

      mcqSheet
        .getRange(2, 1, sampleQuestions.length, sampleQuestions[0].length)
        .setValues(sampleQuestions);
      Logger.log("Đã thêm dữ liệu mẫu MCQ Questions");
    }
  } catch (error) {
    Logger.log("Lỗi khi thêm dữ liệu mẫu: " + error.toString());
  }
}

/**
 * Setup auto-ID generation cho tất cả các sheets
 */
function setupAutoIdGeneration() {
  try {
    Logger.log("=== THIẾT LẬP AUTO ID GENERATION ===");

    const spreadsheet = getOrCreateDatabase();

    // Thiết lập cho từng sheet
    Object.values(DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      setupSheetAutoId(spreadsheet, sheetConfig);
    });

    Logger.log("=== HOÀN THÀNH THIẾT LẬP AUTO ID ===");
  } catch (error) {
    Logger.log("Lỗi khi thiết lập auto ID: " + error.toString());
  }
}

/**
 * Thiết lập auto-ID cho một sheet cụ thể
 */
function setupSheetAutoId(spreadsheet, sheetConfig) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetConfig.name);
    if (!sheet) return;

    // Tạo trigger onEdit cho sheet này
    Logger.log("Thiết lập auto-ID cho sheet: " + sheetConfig.name);

    // Thêm data validation cho cột ID (optional)
    const idColumn = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1);

    // Thêm note cho user về auto-ID
    sheet
      .getRange(1, 1)
      .setNote(
        "ID tự động: Để trống để hệ thống tạo ID tự động. " +
          "Format: " +
          getIdPrefixForSheet(sheetConfig.name) +
          "XXX"
      );
  } catch (error) {
    Logger.log(
      "Lỗi thiết lập auto-ID cho sheet " +
        sheetConfig.name +
        ": " +
        error.toString()
    );
  }
}

/**
 * Lấy prefix tương ứng với sheet
 */
function getIdPrefixForSheet(sheetName) {
  const prefixMap = {
    Users: "USR",
    Topics: "TOP",
    MCQ_Questions: "MCQ",
    Matching_Pairs: "MAT",
    Logs: "LOG",
  };

  return prefixMap[sheetName] || "ID";
}

/**
 * Function được gọi khi có thay đổi trong sheet
 * Tự động tạo ID cho các dòng mới
 */
function onSheetEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const sheetName = sheet.getName();

    // Chỉ xử lý các sheet trong DB_CONFIG
    const validSheets = Object.values(DB_CONFIG.SHEETS).map((s) => s.name);
    if (!validSheets.includes(sheetName)) return;

    // Chỉ xử lý khi thêm dữ liệu vào cột không phải cột ID (cột 1)
    if (range.getColumn() === 1) return;

    const row = range.getRow();

    // Bỏ qua header row
    if (row === 1) return;

    // Kiểm tra xem cột ID có trống không
    const idCell = sheet.getRange(row, 1);
    const currentId = idCell.getValue();

    if (!currentId || currentId === "") {
      // Tạo ID mới
      const prefix = getIdPrefixForSheet(sheetName);
      const newId = generateNextId(sheetName, prefix);

      idCell.setValue(newId);
      Logger.log("Đã tạo ID mới: " + newId + " cho sheet: " + sheetName);
    }
  } catch (error) {
    Logger.log("Lỗi trong onSheetEdit: " + error.toString());
  }
}

/**
 * Tự động điền ID cho nhiều dòng trống
 */
function fillMissingIds(sheetName) {
  try {
    const sheet = getSheet(sheetName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const prefix = getIdPrefixForSheet(sheetName);
    let hasChanges = false;

    // Duyệt qua từng dòng (bỏ qua header)
    for (let i = 1; i < data.length; i++) {
      const currentId = data[i][0];

      // Nếu ID trống hoặc không hợp lệ
      if (!currentId || !validateId(currentId.toString(), prefix)) {
        const newId = generateNextId(sheetName, prefix);
        sheet.getRange(i + 1, 1).setValue(newId);
        hasChanges = true;
        Logger.log("Đã điền ID: " + newId + " cho dòng " + (i + 1));
      }
    }

    if (hasChanges) {
      // Sắp xếp lại để đảm bảo thứ tự
      reorderSheetIds(sheetName, prefix);
    }

    Logger.log("Hoàn thành điền ID cho sheet: " + sheetName);
  } catch (error) {
    Logger.log("Lỗi khi điền ID: " + error.toString());
  }
}

/**
 * Điền ID cho tất cả các sheet
 */
function fillAllMissingIds() {
  try {
    Logger.log("=== BẮT ĐẦU ĐIỀN ID CHO TẤT CẢ SHEET ===");

    Object.values(DB_CONFIG.SHEETS).forEach((sheetConfig) => {
      fillMissingIds(sheetConfig.name);
    });

    Logger.log("=== HOÀN THÀNH ĐIỀN ID ===");
  } catch (error) {
    Logger.log("Lỗi khi điền tất cả ID: " + error.toString());
  }
}
