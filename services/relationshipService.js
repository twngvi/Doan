/**
 * relationshipService.js - Database Relationships Management
 *
 * Tác dụng:
 * - Quản lý liên kết khóa chính và khóa ngoại giữa các bảng
 * - Tạo dropdown list để chọn ID từ bảng khác
 * - Validate foreign key references
 * - Maintain referential integrity
 * - Auto-update dependent data khi có thay đổi
 *
 * Relationships trong hệ thống:
 * - Topics (PRIMARY) ← MCQ_Questions.topicId (FOREIGN)
 * - Topics (PRIMARY) ← Matching_Pairs.topicId (FOREIGN)
 * - Users (PRIMARY) ← Topics.createdBy (FOREIGN)
 * - Users (PRIMARY) ← MCQ_Questions.createdBy (FOREIGN)
 * - Users (PRIMARY) ← Matching_Pairs.createdBy (FOREIGN)
 * - Users (PRIMARY) ← Logs.userId (FOREIGN)
 */

/**
 * Cấu hình relationships giữa các bảng
 */
const RELATIONSHIPS = {
  // MCQ_Questions references
  MCQ_QUESTIONS: {
    topicId: {
      referencedTable: "Topics",
      referencedColumn: "topicId",
      displayColumns: ["topicId", "title"], // Hiển thị ID và title
      onDelete: "RESTRICT", // Không cho xóa topic nếu có câu hỏi
      onUpdate: "CASCADE", // Cập nhật ID trong câu hỏi nếu topic ID thay đổi
    },
  },

  // Matching_Pairs references
  MATCHING_PAIRS: {
    topicId: {
      referencedTable: "Topics",
      referencedColumn: "topicId",
      displayColumns: ["topicId", "title"],
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
  },
};

/**
 * Thiết lập data validation và dropdown cho foreign keys
 */
function setupForeignKeyDropdowns() {
  try {
    Logger.log("=== THIẾT LẬP FOREIGN KEY DROPDOWNS ===");

    const spreadsheet = getOrCreateDatabase();

    // Thiết lập cho từng relationship
    Object.keys(RELATIONSHIPS).forEach((tableName) => {
      const tableConfig = RELATIONSHIPS[tableName];
      const sheet = spreadsheet.getSheetByName(tableName.replace("_", "_"));

      if (!sheet) {
        Logger.log(`Sheet ${tableName} không tồn tại`);
        return;
      }

      Object.keys(tableConfig).forEach((columnName) => {
        const relationship = tableConfig[columnName];
        setupColumnDropdown(sheet, tableName, columnName, relationship);
      });
    });

    Logger.log("=== HOÀN THÀNH THIẾT LẬP DROPDOWNS ===");
    return true;
  } catch (error) {
    Logger.log("Lỗi khi thiết lập dropdowns: " + error.toString());
    return false;
  }
}

/**
 * Thiết lập dropdown cho một cột cụ thể
 */
function setupColumnDropdown(sheet, tableName, columnName, relationship) {
  try {
    // Lấy index của cột
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const columnIndex = headers.indexOf(columnName) + 1;

    if (columnIndex === 0) {
      Logger.log(`Không tìm thấy cột ${columnName} trong sheet ${tableName}`);
      return;
    }

    // Tạo dropdown validation
    const validationRange = sheet.getRange(
      2,
      columnIndex,
      sheet.getMaxRows() - 1,
      1
    );

    // Lấy dữ liệu từ bảng tham chiếu để tạo dropdown
    const referenceData = getReferenceData(
      relationship.referencedTable,
      relationship.displayColumns
    );

    if (referenceData.length > 0) {
      // Tạo range cho validation (chỉ lấy IDs)
      const referenceSheet = getSheet(relationship.referencedTable);
      const dataRange = referenceSheet.getRange(2, 1, referenceData.length, 1);

      // Thiết lập data validation
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(dataRange)
        .setAllowInvalid(false)
        .setHelpText(
          `Chọn ${relationship.referencedColumn} từ bảng ${relationship.referencedTable}`
        )
        .build();

      validationRange.setDataValidation(rule);

      // Thêm note hướng dẫn
      sheet
        .getRange(1, columnIndex)
        .setNote(
          `🔗 FOREIGN KEY\n` +
            `Tham chiếu: ${relationship.referencedTable}.${relationship.referencedColumn}\n` +
            `Chọn từ dropdown hoặc nhập ID hợp lệ\n` +
            `Ràng buộc: ${relationship.onDelete}`
        );

      Logger.log(
        `Đã thiết lập dropdown cho ${tableName}.${columnName} → ${relationship.referencedTable}`
      );
    }
  } catch (error) {
    Logger.log(`Lỗi thiết lập dropdown cho ${columnName}: ${error.toString()}`);
  }
}

/**
 * Lấy dữ liệu tham chiếu từ bảng khác
 */
function getReferenceData(tableName, displayColumns) {
  try {
    const sheet = getSheet(tableName);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();

    // Bỏ header row và trả về dữ liệu
    return data.slice(1).filter((row) => row[0] && row[0] !== "");
  } catch (error) {
    Logger.log(
      `Lỗi lấy dữ liệu tham chiếu từ ${tableName}: ${error.toString()}`
    );
    return [];
  }
}

/**
 * Validate foreign key khi thêm/sửa dữ liệu
 */
function validateForeignKey(tableName, columnName, value) {
  try {
    if (!value || value === "") return true; // Cho phép NULL

    const relationships = RELATIONSHIPS[tableName.toUpperCase()];
    if (!relationships || !relationships[columnName]) {
      return true; // Không có ràng buộc
    }

    const relationship = relationships[columnName];
    const referenceSheet = getSheet(relationship.referencedTable);

    if (!referenceSheet) return false;

    // Kiểm tra value có tồn tại trong bảng tham chiếu không
    const data = referenceSheet.getDataRange().getValues();
    const referenceColumnIndex = data[0].indexOf(relationship.referencedColumn);

    for (let i = 1; i < data.length; i++) {
      if (data[i][referenceColumnIndex] === value) {
        return true;
      }
    }

    return false; // Không tìm thấy reference
  } catch (error) {
    Logger.log(`Lỗi validate foreign key: ${error.toString()}`);
    return false;
  }
}

/**
 * Lấy danh sách các giá trị hợp lệ cho foreign key
 */
function getValidForeignKeyValues(tableName, columnName) {
  try {
    const relationships = RELATIONSHIPS[tableName.toUpperCase()];
    if (!relationships || !relationships[columnName]) {
      return [];
    }

    const relationship = relationships[columnName];
    const referenceData = getReferenceData(
      relationship.referencedTable,
      relationship.displayColumns
    );

    return referenceData.map((row) => ({
      value: row[0], // ID
      display: `${row[0]} - ${row[1] || ""}`, // ID - Name
    }));
  } catch (error) {
    Logger.log(`Lỗi lấy foreign key values: ${error.toString()}`);
    return [];
  }
}

/**
 * Kiểm tra ràng buộc trước khi xóa record
 */
function checkDeleteConstraints(tableName, recordId) {
  try {
    const constraints = [];

    // Tìm tất cả bảng tham chiếu đến bảng này
    Object.keys(RELATIONSHIPS).forEach((refTableName) => {
      const tableRelationships = RELATIONSHIPS[refTableName];

      Object.keys(tableRelationships).forEach((columnName) => {
        const relationship = tableRelationships[columnName];

        if (relationship.referencedTable === tableName) {
          // Kiểm tra có record nào tham chiếu không
          const refSheet = getSheet(refTableName.replace("_", "_"));
          if (refSheet) {
            const data = refSheet.getDataRange().getValues();
            const headers = data[0];
            const columnIndex = headers.indexOf(columnName);

            for (let i = 1; i < data.length; i++) {
              if (data[i][columnIndex] === recordId) {
                constraints.push({
                  table: refTableName,
                  column: columnName,
                  action: relationship.onDelete,
                  row: i + 1,
                });
              }
            }
          }
        }
      });
    });

    return constraints;
  } catch (error) {
    Logger.log(`Lỗi kiểm tra delete constraints: ${error.toString()}`);
    return [];
  }
}

/**
 * Loại bỏ function highlight foreign keys (theo yêu cầu user)
 */
function highlightForeignKeyColumns() {
  try {
    Logger.log("=== SKIP HIGHLIGHT FOREIGN KEY COLUMNS ===");
    // Loại bỏ highlight theo yêu cầu user
    Logger.log("=== ĐÃ BỎ QUA HIGHLIGHT ===");
  } catch (error) {
    Logger.log("Lỗi highlight foreign keys: " + error.toString());
  }
}

/**
 * Test function - Kiểm tra relationships
 */
function testForeignKeySetup() {
  try {
    Logger.log("=== TEST FOREIGN KEY SETUP ===");

    // 1. Thiết lập dropdowns
    const dropdownResult = setupForeignKeyDropdowns();
    Logger.log(`Dropdown setup: ${dropdownResult ? "SUCCESS" : "FAILED"}`);

    // 2. Highlight columns
    highlightForeignKeyColumns();

    // 3. Test validation
    const testCases = [
      { table: "MCQ_Questions", column: "topicId", value: "TOP001" },
      { table: "MCQ_Questions", column: "topicId", value: "INVALID" },
    ];

    testCases.forEach((testCase) => {
      const isValid = validateForeignKey(
        testCase.table,
        testCase.column,
        testCase.value
      );
      Logger.log(
        `Validate ${testCase.table}.${testCase.column} = '${testCase.value}': ${
          isValid ? "VALID" : "INVALID"
        }`
      );
    });

    // 4. Test lấy valid values
    const validTopicIds = getValidForeignKeyValues("MCQ_Questions", "topicId");
    Logger.log("Valid Topic IDs: " + JSON.stringify(validTopicIds));

    Logger.log("=== HOÀN THÀNH TEST ===");
  } catch (error) {
    Logger.log("Lỗi test foreign keys: " + error.toString());
  }
}

/**
 * Refresh tất cả foreign key validations
 */
function refreshForeignKeyValidations() {
  try {
    Logger.log("=== REFRESH FOREIGN KEY VALIDATIONS ===");

    // Xóa validation cũ và tạo lại
    setupForeignKeyDropdowns();
    highlightForeignKeyColumns();

    Logger.log("=== HOÀN THÀNH REFRESH ===");
    return true;
  } catch (error) {
    Logger.log("Lỗi refresh validations: " + error.toString());
    return false;
  }
}
