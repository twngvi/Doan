/**
 * matchingService.js - Matching Game Service
 *
 * Tác dụng:
 * - Quản lý trò chơi ghép nối (matching pairs)
 * - Tạo và shuffle các cặp từ vựng/định nghĩa
 * - Xử lý game logic và scoring
 * - Tracking time và accuracy
 * - Support nhiều loại matching (text-text, text-image, audio-text)
 *
 * Các function chính:
 * - createMatchingPair(): Tạo cặp ghép nối
 * - generateMatchingGame(): Tạo game mới
 * - validateMatch(): Kiểm tra ghép đúng/sai
 * - calculateScore(): Tính điểm dựa trên thời gian và độ chính xác
 * - getGameStats(): Thống kê kết quả game
 * - saveGameResult(): Lưu kết quả
 */
