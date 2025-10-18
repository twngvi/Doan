/**
 * idGenerator.js - Unique ID Generation Utility
 *
 * Tác dụng:
 * - Sinh ID tự động cho các entity (User, Question, Topic, etc.)
 * - Đảm bảo tính unique và không trùng lặp
 * - Support nhiều format ID khác nhau
 * - Tối ưu performance khi generate ID hàng loạt
 * - Tracking và maintain ID sequences
 *
 * Các function chính:
 * - generateUserId(): Tạo ID cho user
 * - generateQuestionId(): Tạo ID cho câu hỏi
 * - generateTopicId(): Tạo ID cho chủ đề
 * - generateUUID(): Tạo UUID chuẩn
 * - generateShortId(): Tạo ID ngắn gọn
 * - validateId(): Kiểm tra ID hợp lệ
 */
