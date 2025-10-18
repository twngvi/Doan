/**
 * matchingModel.js - Matching Pairs Data Model
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc dữ liệu cho trò chơi ghép nối
 * - Mapping matching pairs từ Google Sheets
 * - Validation cho pair data và game rules
 * - Logic shuffle và randomize pairs
 * - Relationship với Topics và Game sessions
 *
 * Matching Schema:
 * - pairId: Unique identifier
 * - topicId: ID chủ đề liên quan
 * - leftItem: Item bên trái (từ, khái niệm)
 * - rightItem: Item bên phải (định nghĩa, hình ảnh)
 * - itemType: Loại item (text, image, audio)
 * - difficulty: Độ khó của cặp
 * - hints: Gợi ý nếu có
 * - createdBy: Người tạo
 * - usageCount: Số lần được chơi
 * - successRate: Tỷ lệ ghép đúng
 */
