/**
 * topicModel.js - Topic Data Model
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc dữ liệu Topic entity
 * - Mapping topic data từ Google Sheets
 * - Validation rules cho topic content
 * - Category classification logic
 * - Relationship với Questions và Users
 *
 * Topic Schema:
 * - topicId: Unique identifier
 * - title: Tiêu đề chủ đề
 * - description: Mô tả chi tiết
 * - category: Danh mục (Math, English, Science, etc.)
 * - difficulty: Độ khó (Easy, Medium, Hard)
 * - createdBy: Người tạo (userId)
 * - createdAt: Ngày tạo
 * - isPublic: Công khai hay riêng tư
 * - tags: Các tag liên quan
 * - viewCount: Số lượt xem
 */
