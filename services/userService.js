/**
 * userService.js - User Management Service
 *
 * Tác dụng:
 * - Xử lý đăng ký người dùng mới (validation, hash password)
 * - Đăng nhập và tạo session/token
 * - Quản lý profile người dùng (xem, cập nhật thông tin)
 * - Xử lý forgot password và reset password
 * - Phân quyền người dùng (student, teacher, admin)
 *
 * Các function chính:
 * - registerUser(): Đăng ký tài khoản
 * - loginUser(): Đăng nhập
 * - getUserProfile(): Lấy thông tin cá nhân
 * - updateProfile(): Cập nhật thông tin
 * - changePassword(): Đổi mật khẩu
 * - resetPassword(): Reset mật khẩu
 * - validateSession(): Kiểm tra phiên đăng nhập
 */
