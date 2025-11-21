/**
 * idGenerator.js - Automatic ID Generation System
 *
 * Tác dụng:
 * - Sinh ID tự động cho các entity trong database
 * - Format: PREFIX + số (3 chữ số)
 * - PREFIX lấy từ chữ cái đầu của tên bảng:
 *   + Users → USR001, USR002, USR003...
 *   + Topics → TOP001, TOP002, TOP003...
 *   + MCQ_Questions → MCQ001, MCQ002, MCQ003...
 *   + Matching_Pairs → MAT001, MAT002, MAT003...
 *   + Logs → LOG001, LOG002, LOG003...
 * - Đảm bảo ID không trùng lặp và luôn tăng dần
 * - Hỗ trợ tạo nhiều ID cùng lúc (batch processing)
 */

/**
 * Cấu hình prefix cho từng loại ID từ chữ cái đầu
 */
const ID_PREFIXES = {
  USER: "USR", // Users → USR
  TOPIC: "TOP", // Topics → TOP
  QUESTION: "MCQ", // MCQ_Questions → MCQ
  MATCHING: "MAT", // Matching_Pairs → MAT
  LOG: "LOG", // Logs → LOG
};

/**
 * Sinh ID mới cho một entity
 * @param {string} sheetName - Tên sheet (Users, Topics, MCQ_Questions...)
 * @param {string} prefix - Prefix cho ID (USR, TOP, MCQ, MAT, LOG)
 * @returns {string} - ID mới (ví dụ: USR001, TOP002, MCQ003...)
 */
function generateNextId(sheetName, prefix) {
  try {
    // Lấy sheet tương ứng
    const sheet = getSheet(sheetName);
    if (!sheet) {
      throw new Error(`Không tìm thấy sheet: ${sheetName}`);
    }

    // Lấy tất cả dữ liệu trong cột ID (cột A)
    const data = sheet.getDataRange().getValues();

    // Tìm số lớn nhất hiện có với prefix này
    let maxNumber = 0;

    for (let i = 1; i < data.length; i++) {
      // Bỏ qua header row
      const currentId = data[i][0];
      if (currentId && typeof currentId === "string") {
        // Kiểm tra ID có đúng format không (PREFIX + số)
        const match = currentId.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const number = parseInt(match[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }

    // Tạo ID mới bằng cách tăng số lớn nhất lên 1
    const nextNumber = maxNumber + 1;
    const newId = prefix + nextNumber.toString().padStart(3, "0");

    Logger.log(`Đã tạo ID mới: ${newId} cho sheet ${sheetName}`);
    return newId;
  } catch (error) {
    Logger.log(`Lỗi khi tạo ID cho ${sheetName}: ${error.toString()}`);
    throw error;
  }
}

/**
 * Sinh nhiều ID liên tiếp (cho batch processing)
 * @param {string} sheetName - Tên sheet
 * @param {string} prefix - Prefix cho ID
 * @param {number} count - Số lượng ID cần tạo
 * @returns {Array<string>} - Mảng các ID mới
 */
function generateMultipleIds(sheetName, prefix, count) {
  try {
    if (count <= 0) return [];

    // Lấy sheet tương ứng
    const sheet = getSheet(sheetName);
    if (!sheet) {
      throw new Error(`Không tìm thấy sheet: ${sheetName}`);
    }

    // Lấy tất cả dữ liệu trong cột ID (cột A)
    const data = sheet.getDataRange().getValues();

    // Tìm số lớn nhất hiện có
    let maxNumber = 0;

    for (let i = 1; i < data.length; i++) {
      // Bỏ qua header row
      const currentId = data[i][0];
      if (currentId && typeof currentId === "string") {
        const match = currentId.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const number = parseInt(match[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }

    // Tạo mảng ID liên tiếp
    const newIds = [];
    for (let i = 1; i <= count; i++) {
      const nextNumber = maxNumber + i;
      const newId = prefix + nextNumber.toString().padStart(3, "0");
      newIds.push(newId);
    }

    Logger.log(`Đã tạo ${count} ID cho ${sheetName}: ${newIds.join(", ")}`);
    return newIds;
  } catch (error) {
    Logger.log(`Lỗi khi tạo multiple ID cho ${sheetName}: ${error.toString()}`);
    throw error;
  }
}

/**
 * Tạo ID cho các entity cụ thể - Helper functions
 */
function generateUserId() {
  return generateNextId("Users", "USR");
}

function generateTopicId() {
  return generateNextId("Topics", "TOP");
}

function generateQuestionId() {
  return generateNextId("MCQ_Questions", "MCQ");
}

function generateMatchingPairId() {
  return generateNextId("Matching_Pairs", "MAT");
}

function generateLogId() {
  return generateNextId("Logs", "LOG");
}

/**
 * Kiểm tra ID có hợp lệ không
 * @param {string} id - ID cần kiểm tra
 * @param {string} prefix - Prefix mong đợi
 * @returns {boolean} - true nếu hợp lệ
 */
function validateId(id, prefix) {
  if (!id || typeof id !== "string") return false;

  // Kiểm tra format: PREFIX + 3 chữ số
  const pattern = new RegExp(`^${prefix}\\d{3}$`);
  return pattern.test(id);
}

/**
 * Test function - Kiểm tra tạo ID
 */
function testIdGeneration() {
  try {
    Logger.log("=== TEST ID GENERATION ===");

    // Test tạo ID cho từng loại sheet
    const testCases = [
      { sheetName: "Users", prefix: "USR" },
      { sheetName: "Topics", prefix: "TOP" },
      { sheetName: "MCQ_Questions", prefix: "MCQ" },
      { sheetName: "Matching_Pairs", prefix: "MAT" },
      { sheetName: "Logs", prefix: "LOG" },
    ];

    testCases.forEach((testCase) => {
      try {
        const newId = generateNextId(testCase.sheetName, testCase.prefix);
        Logger.log(`✅ ${testCase.sheetName}: ${newId}`);
      } catch (error) {
        Logger.log(`❌ ${testCase.sheetName}: ${error.toString()}`);
      }
    });

    // Test tạo multiple IDs
    Logger.log("\n=== TEST MULTIPLE ID GENERATION ===");
    const multipleIds = generateMultipleIds("MCQ_Questions", "MCQ", 3);
    Logger.log(`Multiple MCQ IDs: ${multipleIds.join(", ")}`);

    Logger.log("=== HOÀN THÀNH TEST ===");
  } catch (error) {
    Logger.log(`Lỗi test: ${error.toString()}`);
  }
}
