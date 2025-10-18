/**
 * mcqModel.js - Multiple Choice Question Data Model
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc câu hỏi trắc nghiệm
 * - Mapping MCQ data từ Google Sheets
 * - Validation cho question format và answers
 * - Logic xử lý correct/incorrect answers
 * - Relationship với Topics và User responses
 *
 * MCQ Schema:
 * - questionId: Unique identifier
 * - topicId: ID chủ đề liên quan
 * - questionText: Nội dung câu hỏi
 * - options: Mảng các lựa chọn (A, B, C, D)
 * - correctAnswer: Đáp án đúng
 * - explanation: Giải thích đáp án
 * - difficulty: Độ khó câu hỏi
 * - points: Điểm số
 * - createdBy: Người tạo câu hỏi
 * - usageCount: Số lần được sử dụng
 */
