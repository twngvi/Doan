/**
 * dbService.js - Database Service Layer
 *
 * Tác dụng:
 * - Cung cấp interface để thao tác với Google Sheets
 * - Implement CRUD operations cơ bản (Create, Read, Update, Delete)
 * - Xử lý kết nối và truy vấn dữ liệu
 * - Quản lý transaction và rollback
 * - Optimize performance với batch operations
 *
 * Các function chính:
 * - getSheetData(): Lấy dữ liệu từ sheet
 * - insertRow(): Thêm dòng mới
 * - updateRow(): Cập nhật dòng
 * - deleteRow(): Xóa dòng
 * - batchUpdate(): Cập nhật hàng loạt
 * - findByCondition(): Tìm kiếm có điều kiện
 */
