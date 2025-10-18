/**
 * progressModel.js - User Progress Data Model
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc dữ liệu tiến độ học tập
 * - Mapping progress data từ Google Sheets
 * - Track learning milestones và achievements
 * - Calculate completion rates và performance metrics
 * - Relationship với Users, Topics, và Activities
 *
 * Progress Schema:
 * - progressId: Unique identifier
 * - userId: ID người dùng
 * - topicId: ID chủ đề học
 * - activityType: Loại hoạt động (MCQ, Matching, etc.)
 * - completedAt: Thời gian hoàn thành
 * - score: Điểm số đạt được
 * - timeSpent: Thời gian học (phút)
 * - attempts: Số lần thử
 * - isCompleted: Đã hoàn thành chưa
 * - accuracyRate: Tỷ lệ chính xác
 * - streakCount: Số ngày học liên tiếp
 */
