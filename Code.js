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
