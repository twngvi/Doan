/**
 * Code.js - Entry Point & Router
 *
 * Tác dụng:
 * - Nhận và phân tích các HTTP request từ client (GET/POST)
 * - Routing các request đến service tương ứng dựa trên endpoint
 * - Xử lý authentication và authorization
 * - Trả về response JSON chuẩn hóa
 *
 * Các endpoint chính:
 * - /api/user/* : Quản lý người dùng
 * - /api/topic/* : Quản lý chủ đề
 * - /api/mcq/* : Câu hỏi trắc nghiệm
 * - /api/matching/* : Trò chơi ghép nối
 * - /api/history/* : Lịch sử học tập
 * - /api/admin/* : Quản trị hệ thống
 */

/**
 * Function để test tạo database
 * Chạy function này để tạo Google Sheets database
 */
function initializeDatabase() {
  try {
    Logger.log("=== BẮT ĐẦU TẠO DATABASE ===");

    // Gọi function từ schema.js để tạo database
    const url = createAllSheets();

    Logger.log("=== HOÀN THÀNH TẠO DATABASE ===");
    Logger.log("Database URL: " + url);

    return {
      success: true,
      message: "Database đã được tạo thành công!",
      url: url,
    };
  } catch (error) {
    Logger.log("LỖI KHI TẠO DATABASE: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function để thêm dữ liệu câu hỏi mẫu
 */
function addSampleQuestions() {
  try {
    Logger.log("=== BẮT ĐẦU THÊM CÂU HỎI MẪU ===");

    // Thêm dữ liệu mẫu
    addSampleData();

    Logger.log("=== HOÀN THÀNH THÊM CÂU HỎI MẪU ===");

    return {
      success: true,
      message: "Đã thêm dữ liệu câu hỏi mẫu thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI THÊM CÂU HỎI: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
