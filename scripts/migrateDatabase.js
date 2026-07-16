/**
 * migrateDatabase.js - Migration Script
 * 
 * Chạy hàm `migrateUsersSheetData()` trong Google Apps Script Editor để:
 * 1. Dọn dẹp sheet Users, xóa đi các cột thừa không còn sử dụng.
 * 2. Đảm bảo cấu trúc cột khớp chính xác với `DB_CONFIG.SHEETS.USERS.columns`.
 */

function migrateUsersSheetData() {
  const SPREADSHEET_ID = DB_CONFIG.SPREADSHEET_ID; // Từ schemas.js
  if (!SPREADSHEET_ID) {
    Logger.log("Không tìm thấy SPREADSHEET_ID");
    return;
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(DB_CONFIG.SHEETS.USERS.name);
  
  if (!usersSheet) {
    Logger.log("Không tìm thấy sheet " + DB_CONFIG.SHEETS.USERS.name);
    return;
  }
  
  const expectedColumns = DB_CONFIG.SHEETS.USERS.columns;
  const data = usersSheet.getDataRange().getValues();
  const currentHeaders = data[0];
  
  Logger.log("Bắt đầu dọn dẹp sheet Users...");
  
  // Xóa các cột hiện tại không có trong expectedColumns (làm từ phải qua trái để không lệch index)
  for (let i = currentHeaders.length - 1; i >= 0; i--) {
    const colName = currentHeaders[i];
    if (expectedColumns.indexOf(colName) === -1) {
      Logger.log(`Xóa cột thừa: ${colName} tại vị trí ${i + 1}`);
      usersSheet.deleteColumn(i + 1);
    }
  }
  
  // Thêm các cột còn thiếu trong expectedColumns (nếu có)
  const newData = usersSheet.getDataRange().getValues();
  const newHeaders = newData[0];
  
  let currentLastCol = newHeaders.length;
  for (let i = 0; i < expectedColumns.length; i++) {
    const colName = expectedColumns[i];
    if (newHeaders.indexOf(colName) === -1) {
      currentLastCol++;
      usersSheet.getRange(1, currentLastCol).setValue(colName);
      Logger.log(`Thêm cột thiếu: ${colName} tại vị trí ${currentLastCol}`);
    }
  }
  
  // (Tùy chọn) Sắp xếp lại cột cho đúng thứ tự trong schemas.js
  // Việc này phức tạp hơn vì yêu cầu copy dữ liệu, nên nếu chỉ cần xóa thừa và thêm thiếu là đủ.
  // Các hàm của hệ thống dùng indexOf để tìm cột nên thứ tự không quan trọng lắm.
  
  Logger.log("✅ Dọn dẹp hoàn tất!");
}
