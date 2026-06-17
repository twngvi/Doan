/**
 * clientCodeArrangement.js
 * API for Client User to fetch published Code Arrangement game data
 */

function getClientCodeArrangement(topicId) {
  try {
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Không tìm thấy dữ liệu" };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: "Không có câu hỏi nào" };
    
    const headers = data[0];
    const statusIdx = headers.indexOf("status");
    const topicIdx = headers.indexOf("topicId");
    const pubDataIdx = headers.indexOf("publishedData");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdx] === topicId && data[i][statusIdx] === "published") {
        const pubData = data[i][pubDataIdx];
        if (pubData) {
          const parsed = JSON.parse(pubData);
          // Remove originalCode to prevent cheating
          delete parsed.originalCode;
          return { success: true, data: parsed };
        }
      }
    }
    
    return { success: false, message: "Chưa có bài Code Arrangement nào được xuất bản cho Topic này." };
  } catch (error) {
    Logger.log("Error in getClientCodeArrangement: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Fetch all published Code Arrangement games (global)
 */
function getAllClientCodeArrangements() {
  try {
    const ss = getOrCreateDatabase();
    const sheet = ss.getSheetByName("Code_Arrangement");
    if (!sheet) return { success: false, message: "Không tìm thấy dữ liệu" };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: "Không có bài tập nào" };
    
    const headers = data[0];
    const statusIdx = headers.indexOf("status");
    const pubDataIdx = headers.indexOf("publishedData");
    const topicIdIdx = headers.indexOf("topicId");
    
    let publishedGames = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][statusIdx] === "published") {
        const pubData = data[i][pubDataIdx];
        if (pubData) {
          try {
            const parsed = JSON.parse(pubData);
            // Remove originalCode to prevent cheating
            delete parsed.originalCode;
            // Ensure topicId is kept if we need to identify them
            parsed.topicId = data[i][topicIdIdx];
            publishedGames.push(parsed);
          } catch(e) {
            // Ignore parse errors for individual rows
          }
        }
      }
    }
    
    return { success: true, data: publishedGames };
  } catch (error) {
    Logger.log("Error in getAllClientCodeArrangements: " + error.toString());
    return { success: false, message: error.toString() };
  }
}
