/**
 * logModel.js - System Logs Data Model
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc dữ liệu cho system logs
 * - Mapping log entries từ Google Sheets
 * - Standardize log levels và categories
 * - Support audit trail và security monitoring
 * - Performance tracking và error logging
 *
 * Log Schema:
 * - logId: Unique identifier
 * - timestamp: Thời gian ghi log
 * - level: Mức độ (INFO, WARN, ERROR, DEBUG)
 * - category: Danh mục (USER, SYSTEM, SECURITY, PERFORMANCE)
 * - userId: User thực hiện action (nếu có)
 * - action: Hành động được thực hiện
 * - details: Chi tiết về log entry
 * - ipAddress: Địa chỉ IP
 * - userAgent: Browser/device info
 * - sessionId: ID phiên làm việc
 */
