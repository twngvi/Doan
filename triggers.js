/**
 * triggers.js - Google Sheets Trigger Management
 *
 * Tác dụng:
 * - Tạo và quản lý trigger cho Google Sheets
 * - Xử lý sự kiện onEdit khi user chỉnh sửa sheets
 * - Tự động sinh ID khi nhập dữ liệu vào hàng trống
 * - Test và debug trigger functionality
 */ /**
 * Thiết lập trigger tự động cho database
 */
function setupAutoIdTrigger() {
  try {
    Logger.log("=== THIẾT LẬP TRIGGER TỰ ĐỘNG ===");

    const spreadsheet = getOrCreateDatabase();

    // Xóa trigger cũ nếu có
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((trigger) => {
      if (trigger.getHandlerFunction() === "onEdit") {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Tạo trigger mới cho spreadsheet
    const ss = getOrCreateDatabase();
    ScriptApp.newTrigger("onEdit").forSpreadsheet(ss).onEdit().create();

    Logger.log("Đã tạo trigger onEdit thành công!");

    // Thêm hướng dẫn cho user
    addIdInstructions(spreadsheet);

    Logger.log("=== HOÀN THÀNH THIẾT LẬP TRIGGER ===");
    return true;
  } catch (error) {
    Logger.log("Lỗi khi thiết lập trigger: " + error.toString());
    return false;
  }
}

/**
 * Thêm hướng dẫn sử dụng ID tự động
 */
function addIdInstructions(spreadsheet) {
  try {
    const sheetConfigs = Object.values(DB_CONFIG.SHEETS);

    sheetConfigs.forEach((sheetConfig) => {
      const sheet = spreadsheet.getSheetByName(sheetConfig.name);
      if (sheet) {
        const prefix = getIdPrefixForSheet(sheetConfig.name);

        // Thêm note cho cột ID
        const idCell = sheet.getRange(1, 1);
        idCell.setNote(
          `🔄 ID TỰ ĐỘNG\n` +
            `• Để trống cột này\n` +
            `• Nhập dữ liệu vào cột khác → ID tự động tạo\n` +
            `• Format: ${prefix}001, ${prefix}002, ${prefix}003...\n` +
            `• Luôn tăng dần và không trùng lặp`
        );

        // Highlight cột ID
        idCell.setBackground("#e8f0fe");

        Logger.log(`Đã thêm hướng dẫn cho sheet: ${sheetConfig.name}`);
      }
    });
  } catch (error) {
    Logger.log("Lỗi khi thêm hướng dẫn: " + error.toString());
  }
}

/**
 * Function được Google Sheets gọi tự động khi có chỉnh sửa
 * ⚠️ QUAN TRỌNG: Tên function phải là "onEdit" chính xác
 */
function onEdit(e) {
  try {
    // Kiểm tra event có hợp lệ không
    if (!e || !e.source || !e.range) {
      return;
    }

    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const sheetName = sheet.getName();
    const editedColumn = range.getColumn();
    const editedRow = range.getRow();

    // Chỉ xử lý các sheet trong database
    const validSheets = Object.values(DB_CONFIG.SHEETS).map((s) => s.name);
    if (!validSheets.includes(sheetName)) {
      return;
    }

    // Bỏ qua header row
    if (editedRow === 1) {
      return;
    }

    // === XỬ LÝ AUTO-ID (như cũ) ===
    if (editedColumn !== 1) {
      // Không phải cột ID
      const numRows = range.getNumRows();
      const firstDataRow = Math.max(editedRow, 2);
      const lastRow = editedRow + numRows - 1;

      if (firstDataRow <= lastRow) {
        const prefix = getIdPrefixForSheet(sheetName);
        const rowsToProcess = [];

        for (let row = firstDataRow; row <= lastRow; row++) {
          // Kiểm tra xem hàng này có dữ liệu không (bỏ qua cột ID)
          let hasData = false;
          const maxCol = Math.min(
            sheet.getLastColumn(),
            range.getColumn() + range.getNumColumns() - 1
          );

          for (let col = Math.max(2, range.getColumn()); col <= maxCol; col++) {
            const cellValue = sheet.getRange(row, col).getValue();
            if (cellValue && cellValue !== "") {
              hasData = true;
              break;
            }
          }

          if (hasData) {
            // Kiểm tra cột ID có trống không
            const idCell = sheet.getRange(row, 1);
            const currentId = idCell.getValue();

            if (!currentId || currentId === "") {
              rowsToProcess.push(row);
            }
          }
        }

        // Tạo ID cho tất cả hàng cần thiết (batch processing)
        if (rowsToProcess.length > 0) {
          const newIds = generateMultipleIds(
            sheetName,
            prefix,
            rowsToProcess.length
          );

          // Gán ID cho từng hàng
          for (let i = 0; i < rowsToProcess.length; i++) {
            const row = rowsToProcess[i];
            const newId = newIds[i];
            const idCell = sheet.getRange(row, 1);

            idCell.setValue(newId);
            // Loại bỏ highlight màu
          }

          console.log(
            `🎉 Đã tạo ${
              rowsToProcess.length
            } ID cho sheet ${sheetName}: ${newIds.join(", ")}`
          );
        }
      }
    }

    // === XỬ LÝ FOREIGN KEY VALIDATION (mới) ===
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const columnName = headers[editedColumn - 1];
    const editedValue = range.getValue();

    // Kiểm tra có phải foreign key không
    validateForeignKeyEdit(
      sheetName,
      columnName,
      editedValue,
      editedRow,
      editedColumn
    );
    // Loại bỏ highlight màu cho foreign key validation
  } catch (error) {
    // Không throw error để không làm gián đoạn việc edit của user
    console.log("🚫 Lỗi Auto-ID/Foreign Key: " + error.toString());
  }
}

/**
 * Validate foreign key khi user edit
 */
function validateForeignKeyEdit(sheetName, columnName, value, row, col) {
  try {
    // Bỏ qua nếu giá trị trống
    if (!value || value === "") return true;

    // Kiểm tra có phải foreign key không
    const tableName = sheetName.toUpperCase().replace(" ", "_");
    const relationships = RELATIONSHIPS[tableName];

    if (!relationships || !relationships[columnName]) {
      return true; // Không phải foreign key
    }

    // Validate foreign key
    const isValid = validateForeignKey(tableName, columnName, value);

    if (!isValid) {
      // Hiển thị cảnh báo cho user
      const sheet = SpreadsheetApp.getActiveSheet();
      const cell = sheet.getRange(row, col);

      // Loại bỏ highlight đỏ

      // Thêm comment cảnh báo
      const relationship = relationships[columnName];
      cell.setNote(
        `❌ FOREIGN KEY ERROR\n` +
          `Giá trị '${value}' không tồn tại trong bảng ${relationship.referencedTable}\n` +
          `Vui lòng chọn từ dropdown hoặc nhập ID hợp lệ`
      );

      Logger.log(
        `❌ Foreign key violation: ${tableName}.${columnName} = '${value}'`
      );
      return false;
    }

    return true;
  } catch (error) {
    Logger.log(`Lỗi validate foreign key edit: ${error.toString()}`);
    return true; // Không block user nếu có lỗi system
  }
}

/**
 * Lấy prefix ID cho sheet
 */
function getIdPrefixForSheet(sheetName) {
  const sheet = Object.values(DB_CONFIG.SHEETS).find(
    (s) => s.name === sheetName
  );
  return sheet ? sheet.idPrefix : "GEN";
}

/**
 * Test trigger - Tạo dữ liệu test để kiểm tra auto-ID
 */
function testAutoIdTrigger() {
  try {
    Logger.log("=== TEST AUTO-ID TRIGGER ===");

    // Thiết lập trigger
    const success = setupAutoIdTrigger();
    if (!success) {
      throw new Error("Không thể thiết lập trigger");
    }

    // Hướng dẫn test manual
    Logger.log("📝 HƯỚNG DẪN TEST:");
    Logger.log("1. Mở Google Sheets DB_Master");
    Logger.log("2. Chọn sheet Topics hoặc MCQ_Questions");
    Logger.log("3. Để trống cột ID (cột A)");
    Logger.log("4. Nhập dữ liệu vào cột khác (B, C, D...)");
    Logger.log("5. ID sẽ tự động xuất hiện trong cột A");

    Logger.log("=== TRIGGER ĐÃ SẴN SÀNG ===");

    return {
      success: true,
      message:
        "Trigger đã được thiết lập! Hãy thử nhập dữ liệu vào Google Sheets.",
    };
  } catch (error) {
    Logger.log("❌ Lỗi test trigger: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Test Multi-Row Auto-ID - Tạo nhiều hàng cùng lúc
 */
function testMultiRowAutoId() {
  try {
    Logger.log("=== TEST MULTI-ROW AUTO-ID ===");

    const db = getOrCreateDatabase();
    const mcqSheet = db.getSheetByName("MCQ_Questions");

    if (!mcqSheet) {
      throw new Error("Không tìm thấy sheet MCQ_Questions");
    }

    // Tạo dữ liệu test cho nhiều hàng
    const testData = [
      [
        "",
        "Câu hỏi 1 về JavaScript",
        "console.log()",
        "alert()",
        "prompt()",
        "A",
        "Cơ bản",
      ],
      ["", "Câu hỏi 2 về HTML", "<div>", "<span>", "<p>", "A", "Cơ bản"],
      ["", "Câu hỏi 3 về CSS", "color", "background", "border", "A", "Cơ bản"],
      [
        "",
        "Câu hỏi 4 về React",
        "useState",
        "useEffect",
        "useContext",
        "A",
        "Nâng cao",
      ],
      [
        "",
        "Câu hỏi 5 về Node.js",
        "express",
        "koa",
        "fastify",
        "A",
        "Nâng cao",
      ],
    ];

    // Tìm vị trí để chèn dữ liệu (sau dữ liệu hiện có)
    const lastRow = mcqSheet.getLastRow();
    const startRow = lastRow + 1;

    // Chèn dữ liệu vào nhiều hàng cùng lúc
    const range = mcqSheet.getRange(
      startRow,
      1,
      testData.length,
      testData[0].length
    );
    range.setValues(testData);

    Logger.log(`✅ Đã chèn ${testData.length} hàng test từ row ${startRow}`);
    Logger.log("🔄 Auto-ID trigger sẽ tự động tạo ID cho các hàng này");
    Logger.log("📝 Kiểm tra sheet MCQ_Questions để xem kết quả");

    return true;
  } catch (error) {
    Logger.log("🚫 Lỗi Test Multi-Row: " + error.toString());
    return false;
  }
}

/**
 * Xóa tất cả trigger (để cleanup)
 */
function removeAllTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((trigger) => {
      ScriptApp.deleteTrigger(trigger);
    });

    Logger.log("Đã xóa tất cả triggers");
    return true;
  } catch (error) {
    Logger.log("Lỗi khi xóa triggers: " + error.toString());
    return false;
  }
}
