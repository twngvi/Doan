/**
 * splitUsersSheet.js - Script tách Sheet Users (Google Apps Script)
 * 
 * HƯỚNG DẪN:
 * Copy toàn bộ đoạn code này vào màn hình Apps Script của Google Sheets.
 * Chạy hàm `migrateAndSplitUsersSheet()`
 * 
 * Tác dụng:
 * 1. Đọc dữ liệu từ sheet "Users" hiện tại.
 * 2. Tạo sheet "User_Stats" và "User_Pets" nếu chưa có.
 * 3. Trích xuất dữ liệu Thống kê sang User_Stats.
 * 4. Trích xuất dữ liệu Thú cưng sang User_Pets.
 * 5. Cập nhật lại sheet "Users" ĐÚNG 19 cột cốt lõi và xóa vật lý các cột còn lại.
 * 6. Xóa các sheet chat/friends không dùng.
 */

function migrateAndSplitUsersSheet() {
  const SPREADSHEET_ID = "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds"; // Thay bằng ID Sheet của bạn nếu cần
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("Không tìm thấy Spreadsheet.");
    return;
  }
  
  const usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    Logger.log("Không tìm thấy sheet Users.");
    return;
  }
  
  let statsSheet = ss.getSheetByName("User_Stats");
  if (!statsSheet) {
    statsSheet = ss.insertSheet("User_Stats");
    Logger.log("Đã tạo sheet User_Stats.");
  }
  
  let petsSheet = ss.getSheetByName("User_Pets");
  if (!petsSheet) {
    petsSheet = ss.insertSheet("User_Pets");
    Logger.log("Đã tạo sheet User_Pets.");
  }
  
  const usersData = usersSheet.getDataRange().getValues();
  if (!usersData || usersData.length === 0) {
    Logger.log("Sheet Users hoàn toàn trống.");
    return;
  }
  
  const headers = usersData[0];
  const getCol = (name) => headers.indexOf(name);
  
  // ĐÚNG 19 cột cốt lõi của Users
  const usersNewHeaders = [
    "userId", "googleId", "email", "displayName", "username", "passwordHash", "avatarUrl", "role", 
    "isActive", "createdAt", "lastLogin", "lastActiveDate", "activeSessionId", "activeSessionUpdatedAt", 
    "emailVerified", "verificationToken", "verificationExpires", "playerId", "progressSheetId"
  ];
  
  const statsHeaders = [
    "userId", "level", "aiLevel", "totalPoints", "totalXP", "totalXQP", 
    "currentStreak", "longestStreak", "mountainPosition", "mountainStage", 
    "mountainProgress", "totalQuizAnswered", "totalPuzzleSolved", "totalChallengeCompleted"
  ];
  
  const petsHeaders = [
    "userId", "theme", "petName", "petConfig"
  ];
  
  const newUsersData = [usersNewHeaders];
  const newStatsData = [statsHeaders];
  const newPetsData = [petsHeaders];
  
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    
    // Hàm helper lấy giá trị an toàn
    const val = (colName) => getCol(colName) >= 0 ? row[getCol(colName)] : "";
    const userId = val("userId");
    if (!userId) continue;
    
    // Tạo row cho Users
    const uRow = usersNewHeaders.map(h => val(h));
    newUsersData.push(uRow);
    
    // Tạo row cho User_Stats
    const sRow = statsHeaders.map(h => val(h));
    // Default level=1, stage=1
    if (statsHeaders.indexOf("level") >= 0 && !sRow[statsHeaders.indexOf("level")]) sRow[statsHeaders.indexOf("level")] = 1;
    if (statsHeaders.indexOf("mountainStage") >= 0 && !sRow[statsHeaders.indexOf("mountainStage")]) sRow[statsHeaders.indexOf("mountainStage")] = 1;
    newStatsData.push(sRow);
    
    // Tạo row cho User_Pets
    const pRow = petsHeaders.map(h => val(h));
    // Default theme = forest
    if (petsHeaders.indexOf("theme") >= 0 && !pRow[petsHeaders.indexOf("theme")]) pRow[petsHeaders.indexOf("theme")] = "forest";
    if (petsHeaders.indexOf("petName") >= 0 && !pRow[petsHeaders.indexOf("petName")]) pRow[petsHeaders.indexOf("petName")] = "NAMEPET";
    newPetsData.push(pRow);
  }
  
  // Xóa trắng sheet hiện tại và ghi đè
  statsSheet.clear();
  statsSheet.getRange(1, 1, newStatsData.length, newStatsData[0].length).setValues(newStatsData);
  Logger.log("Đã ghi xong dữ liệu User_Stats.");
  
  petsSheet.clear();
  petsSheet.getRange(1, 1, newPetsData.length, newPetsData[0].length).setValues(newPetsData);
  Logger.log("Đã ghi xong dữ liệu User_Pets.");
  
  usersSheet.clear();
  usersSheet.getRange(1, 1, newUsersData.length, newUsersData[0].length).setValues(newUsersData);
  
  // Xóa vật lý các cột thừa trong sheet Users
  const maxCols = usersSheet.getMaxColumns();
  if (maxCols > 19) {
    usersSheet.deleteColumns(20, maxCols - 19);
    Logger.log("Đã xóa vật lý " + (maxCols - 19) + " cột thừa khỏi sheet Users.");
  }
  
  // Xóa CÁC SHEET CHAT THEO YÊU CẦU
  const sheetsToDelete = [
    "FriendRequests", 
    "Friends", 
    "Conversations", 
    "Messages", 
    "Feature_Activity_Logs"
  ];
  
  sheetsToDelete.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      ss.deleteSheet(sheet);
      Logger.log("Đã xóa hoàn toàn sheet: " + name);
    }
  });

  Logger.log("Đã ghi đè lại dữ liệu Users gọn gàng (19 cột).");
  Logger.log("=== HOÀN TẤT TÁCH SHEET VÀ XÓA DỮ LIỆU THỪA ===");
}
