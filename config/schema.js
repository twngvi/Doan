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
