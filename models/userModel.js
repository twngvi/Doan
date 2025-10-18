/**
 * userModel.js - User Data Model
 *
 * Tác dụng:
 * - Định nghĩa cấu trúc dữ liệu User entity
 * - Mapping giữa Google Sheets columns và object properties
 * - Data validation và transformation
 * - Business logic related to User
 * - Relationship với các entities khác
 *
 * User Schema:
 * - userId: Unique identifier
 * - username: Tên đăng nhập
 * - email: Email address
 * - passwordHash: Mật khẩu đã hash
 * - fullName: Họ tên đầy đủ
 * - role: Vai trò (student/teacher/admin)
 * - createdAt: Ngày tạo tài khoản
 * - lastLogin: Lần đăng nhập cuối
 * - isActive: Trạng thái hoạt động
 */
