/**
 * idGenerator.js - Unique ID Generation Utility
 *
 * Tác dụng:
 * - Sinh ID tự động cho các entity (User, Question, Topic, etc.)
 * - Đảm bảo tính unique và không trùng lặp
 * - Support nhiều format ID khác nhau
 * - Tối ưu performance khi generate ID hàng loạt
 * - Tracking và maintain ID sequences
 *
 * Các function chính:
 * - generateUserId(): Tạo ID cho user
 * - generateQuestionId(): Tạo ID cho câu hỏi
 * - generateTopicId(): Tạo ID cho chủ đề
 * - generateUUID(): Tạo UUID chuẩn
 * - generateShortId(): Tạo ID ngắn gọn
 * - validateId(): Kiểm tra ID hợp lệ
 */

/**
 * Cấu hình prefix cho từng loại ID
 */
const ID_PREFIXES = {
  USER: "USR",
  TOPIC: "TOP",
  QUESTION: "MCQ",
  MATCHING: "MAT",
  LOG: "LOG",
};

/**
 * Lấy ID số cao nhất từ sheet
 */
function getMaxIdNumber(sheet, prefix, columnIndex = 0) {
  try {
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    let maxNumber = 0;

    // Bỏ qua header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const cellValue = data[i][columnIndex];
      if (cellValue && typeof cellValue === "string") {
        // Kiểm tra nếu ID có prefix đúng
        if (cellValue.startsWith(prefix)) {
          const numberPart = cellValue.substring(prefix.length);
          const number = parseInt(numberPart);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }

    return maxNumber;
  } catch (error) {
    Logger.log("Lỗi khi lấy max ID: " + error.toString());
    return 0;
  }
}

/**
 * Tạo ID mới với prefix và số tự tăng
 */
function generateNextId(sheetName, prefix, digits = 3) {
  try {
    const sheet = getSheet(sheetName);
    const maxNumber = getMaxIdNumber(sheet, prefix);
    const nextNumber = maxNumber + 1;

    // Format số với leading zeros
    const paddedNumber = nextNumber.toString().padStart(digits, "0");
    return prefix + paddedNumber;
  } catch (error) {
    Logger.log("Lỗi khi tạo ID: " + error.toString());
    return prefix + "001";
  }
}

/**
 * Tạo nhiều ID liên tiếp
 */
function generateMultipleIds(sheetName, prefix, count, digits = 3) {
  try {
    const sheet = getSheet(sheetName);
    const maxNumber = getMaxIdNumber(sheet, prefix);
    const ids = [];

    for (let i = 1; i <= count; i++) {
      const nextNumber = maxNumber + i;
      const paddedNumber = nextNumber.toString().padStart(digits, "0");
      ids.push(prefix + paddedNumber);
    }

    return ids;
  } catch (error) {
    Logger.log("Lỗi khi tạo nhiều ID: " + error.toString());
    return [];
  }
}

/**
 * Tạo User ID
 */
function generateUserId() {
  return generateNextId(DB_CONFIG.SHEETS.USERS.name, ID_PREFIXES.USER);
}

/**
 * Tạo Topic ID
 */
function generateTopicId() {
  return generateNextId(DB_CONFIG.SHEETS.TOPICS.name, ID_PREFIXES.TOPIC);
}

/**
 * Tạo Question ID
 */
function generateQuestionId() {
  return generateNextId(
    DB_CONFIG.SHEETS.MCQ_QUESTIONS.name,
    ID_PREFIXES.QUESTION
  );
}

/**
 * Tạo Matching Pair ID
 */
function generateMatchingId() {
  return generateNextId(
    DB_CONFIG.SHEETS.MATCHING_PAIRS.name,
    ID_PREFIXES.MATCHING
  );
}

/**
 * Tạo Log ID
 */
function generateLogId() {
  return generateNextId(DB_CONFIG.SHEETS.LOGS.name, ID_PREFIXES.LOG);
}

/**
 * Kiểm tra ID có hợp lệ không
 */
function validateId(id, prefix) {
  if (!id || typeof id !== "string") return false;

  // Kiểm tra prefix
  if (!id.startsWith(prefix)) return false;

  // Kiểm tra phần số
  const numberPart = id.substring(prefix.length);
  return /^\d+$/.test(numberPart);
}

/**
 * Sắp xếp lại ID trong sheet để đảm bảo thứ tự
 */
function reorderSheetIds(sheetName, prefix) {
  try {
    const sheet = getSheet(sheetName);
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Sắp xếp rows theo ID
    rows.sort((a, b) => {
      const idA = a[0] || "";
      const idB = b[0] || "";

      if (idA.startsWith(prefix) && idB.startsWith(prefix)) {
        const numA = parseInt(idA.substring(prefix.length));
        const numB = parseInt(idB.substring(prefix.length));
        return numA - numB;
      }

      return idA.localeCompare(idB);
    });

    // Cập nhật lại sheet
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    Logger.log("Đã sắp xếp lại IDs trong sheet: " + sheetName);
    return true;
  } catch (error) {
    Logger.log("Lỗi khi sắp xếp IDs: " + error.toString());
    return false;
  }
}

/**
 * Test function cho ID generator
 */
function testIdGenerator() {
  try {
    Logger.log("=== TEST ID GENERATOR ===");

    // Test tạo từng loại ID
    const userId = generateUserId();
    const topicId = generateTopicId();
    const questionId = generateQuestionId();
    const matchingId = generateMatchingId();
    const logId = generateLogId();

    Logger.log("User ID: " + userId);
    Logger.log("Topic ID: " + topicId);
    Logger.log("Question ID: " + questionId);
    Logger.log("Matching ID: " + matchingId);
    Logger.log("Log ID: " + logId);

    // Test tạo nhiều ID
    const multipleIds = generateMultipleIds(
      DB_CONFIG.SHEETS.TOPICS.name,
      ID_PREFIXES.TOPIC,
      5
    );
    Logger.log("Multiple Topic IDs: " + multipleIds.join(", "));

    // Test validation
    Logger.log("Validate USR001: " + validateId("USR001", ID_PREFIXES.USER));
    Logger.log("Validate TOP123: " + validateId("TOP123", ID_PREFIXES.TOPIC));
    Logger.log("Validate INVALID: " + validateId("INVALID", ID_PREFIXES.USER));

    Logger.log("=== TEST COMPLETED ===");
  } catch (error) {
    Logger.log("Lỗi test ID generator: " + error.toString());
  }
}
