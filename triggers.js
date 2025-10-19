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

    // Chỉ xử lý các sheet trong database
    const validSheets = Object.values(DB_CONFIG.SHEETS).map((s) => s.name);
    if (!validSheets.includes(sheetName)) {
      return;
    }

    const row = range.getRow();
    const col = range.getColumn();

    // Bỏ qua header row (row 1)
    if (row === 1) {
      return;
    }

    // Bỏ qua nếu edit chính cột ID (col 1)
    if (col === 1) {
      return;
    }

    // Kiểm tra xem người dùng có nhập dữ liệu không
    const cellValue = range.getValue();
    if (!cellValue || cellValue === "") {
      return;
    }

    // Kiểm tra cột ID có trống không
    const idCell = sheet.getRange(row, 1);
    const currentId = idCell.getValue();

    // Chỉ tạo ID nếu cột ID trống
    if (!currentId || currentId === "") {
      const prefix = getIdPrefixForSheet(sheetName);
      const newId = generateNextId(sheetName, prefix);

      // Gán ID mới
      idCell.setValue(newId);

      // Highlight ID vừa tạo
      idCell.setBackground("#d4edda");

      // Log để theo dõi (có thể tắt trong production)
      console.log(`✅ Auto-ID: ${newId} → Row ${row}, Sheet: ${sheetName}`);
    }
  } catch (error) {
    // Không throw error để không làm gián đoạn việc edit của user
    console.log("🚫 Lỗi Auto-ID: " + error.toString());
  }
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
