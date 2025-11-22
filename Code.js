/**
 * Code.js - Entry Point & Main Functions
 *
 * Tác dụng:
 * - Entry point cho các function chính của hệ thống
 * - Tạo và quản lý database
 * - Thiết lập các tính năng tự động
 * - Test và debug hệ thống
 *
 * Các function chính:
 * - initializeDatabase(): Tạo database Google Sheets
 * - setupAutoIds(): Thiết lập tự động tạo ID
 * - addSampleQuestions(): Thêm dữ liệu mẫu
 * - reorderAllIds(): Sắp xếp ID
 * - fillExistingData(): Điền ID cho dữ liệu có sẵn
 */

/**
 * Function để test tạo database
 * Chạy function này để tạo Google Sheets database
 */
function initializeDatabase() {
  try {
    Logger.log("=== BẮT ĐẦU TẠO DATABASE ===");

    // Gọi function từ schema.js để tạo database
    const url = createAllSheets();

    Logger.log("=== HOÀN THÀNH TẠO DATABASE ===");
    Logger.log("Database URL: " + url);

    return {
      success: true,
      message: "Database đã được tạo thành công!",
      url: url,
    };
  } catch (error) {
    Logger.log("LỖI KHI TẠO DATABASE: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function để xóa và tạo lại database mới hoàn toàn
 * CHỈ DÙNG KHI GẶP LỖI VỚI DATABASE CŨ
 */
function resetDatabase() {
  try {
    Logger.log("=== BẮT ĐẦU XÓA DATABASE CŨ ===");

    // Tìm và xóa DB_Master cũ
    const files = DriveApp.getFilesByName("DB_Master");
    while (files.hasNext()) {
      const file = files.next();
      Logger.log("Deleting old database: " + file.getId());
      file.setTrashed(true);
    }

    Logger.log("=== TẠO DATABASE MỚI ===");

    // Tạo database mới
    const ss = SpreadsheetApp.create("DB_Master");
    const ssId = ss.getId();
    Logger.log("Created new database: " + ssId);

    // Xóa sheet mặc định nếu có
    const sheets = ss.getSheets();
    const defaultSheetNames = [
      "Sheet1",
      "Sheet",
      "Trang tính1",
      "Trang tính 1",
    ];

    // Tạo Users sheet trước
    const usersSheet = ss.insertSheet("Users");
    const userHeaders = [
      "userId",
      "username",
      "email",
      "passwordHash",
      "fullName",
      "role",
      "createdAt",
      "lastLogin",
      "isActive",
      "spreadsheetId",
    ];
    usersSheet.getRange(1, 1, 1, userHeaders.length).setValues([userHeaders]);
    usersSheet.getRange(1, 1, 1, userHeaders.length).setFontWeight("bold");
    usersSheet.getRange(1, 1, 1, userHeaders.length).setBackground("#4285f4");
    usersSheet.getRange(1, 1, 1, userHeaders.length).setFontColor("white");
    usersSheet.setFrozenRows(1);
    Logger.log("Created Users sheet");

    // Tạo các sheet khác
    const sheetsConfig = [
      {
        name: "Topics",
        headers: ["topicId", "title", "description", "category"],
      },
      {
        name: "MCQ_Questions",
        headers: [
          "questionId",
          "topicId",
          "questionText",
          "optionA",
          "optionB",
          "optionC",
          "optionD",
          "correctAnswer",
          "explanation",
          "difficulty",
          "hint",
          "points",
        ],
      },
      {
        name: "Matching_Pairs",
        headers: [
          "pairId",
          "topicId",
          "leftItem",
          "rightItem",
          "itemType",
          "difficulty",
          "hints",
        ],
      },
      {
        name: "Logs",
        headers: [
          "logId",
          "timestamp",
          "level",
          "category",
          "userId",
          "action",
          "details",
          "ipAddress",
          "userAgent",
          "sessionId",
        ],
      },
    ];

    sheetsConfig.forEach((config) => {
      const sheet = ss.insertSheet(config.name);
      sheet
        .getRange(1, 1, 1, config.headers.length)
        .setValues([config.headers]);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight("bold");
      sheet.getRange(1, 1, 1, config.headers.length).setBackground("#4285f4");
      sheet.getRange(1, 1, 1, config.headers.length).setFontColor("white");
      sheet.setFrozenRows(1);
      Logger.log("Created sheet: " + config.name);
    });

    // Xóa các sheet mặc định
    sheets.forEach((sheet) => {
      const sheetName = sheet.getName();
      if (defaultSheetNames.includes(sheetName)) {
        Logger.log("Deleting default sheet: " + sheetName);
        ss.deleteSheet(sheet);
      }
    });

    Logger.log("=== HOÀN THÀNH RESET DATABASE ===");
    Logger.log("Database URL: " + ss.getUrl());
    Logger.log("Database ID: " + ssId);

    return {
      success: true,
      message: "Database đã được reset thành công!",
      url: ss.getUrl(),
      id: ssId,
    };
  } catch (error) {
    Logger.log("LỖI KHI RESET DATABASE: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function để thêm dữ liệu câu hỏi mẫu
 */
function addSampleQuestions() {
  try {
    Logger.log("=== BẮT ĐẦU THÊM CÂU HỎI MẪU ===");

    // Thêm dữ liệu mẫu
    addSampleData();

    Logger.log("=== HOÀN THÀNH THÊM CÂU HỎI MẪU ===");

    return {
      success: true,
      message: "Đã thêm dữ liệu câu hỏi mẫu thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI THÊM CÂU HỎI: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function thiết lập hệ thống Auto-ID với trigger
 */
function setupAutoIds() {
  try {
    Logger.log("=== BẮT ĐẦU THIẾT LẬP AUTO-ID ===");

    // Thiết lập trigger tự động
    const triggerResult = setupAutoIdTrigger();

    if (!triggerResult) {
      throw new Error("Không thể thiết lập trigger");
    }

    Logger.log("=== HOÀN THÀNH THIẾT LẬP AUTO-ID ===");
    Logger.log("🎉 ID sẽ tự động tạo khi bạn nhập dữ liệu vào Google Sheets!");

    return {
      success: true,
      message:
        "Đã thiết lập Auto-ID thành công! ID sẽ tự tạo khi nhập dữ liệu.",
    };
  } catch (error) {
    Logger.log("LỖI KHI THIẾT LẬP AUTO-ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * TEST: Kiểm tra Multi-Row Auto-ID
 */
function testMultiRow() {
  return testMultiRowAutoId();
}

/**
 * Function test tính năng tạo ID tự động
 */
function testAutoIdFeature() {
  try {
    Logger.log("=== TEST AUTO-ID FEATURE ===");

    // Test ID generator functions
    testIdGenerator();

    // Test và thiết lập trigger
    const result = testAutoIdTrigger();

    Logger.log("=== HOÀN THÀNH TEST ===");

    return result;
  } catch (error) {
    Logger.log("LỖI KHI TEST AUTO-ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function để sắp xếp lại ID trong tất cả sheet
 */
function reorderAllIds() {
  try {
    Logger.log("=== BẮT ĐẦU SẮP XẾP LẠI ID ===");

    const prefixMap = {
      Users: "USR",
      Topics: "TOP",
      MCQ_Questions: "MCQ",
      Matching_Pairs: "MAT",
      Logs: "LOG",
    };

    Object.entries(prefixMap).forEach(([sheetName, prefix]) => {
      reorderSheetIds(sheetName, prefix);
    });

    Logger.log("=== HOÀN THÀNH SẮP XẾP LẠI ID ===");

    return {
      success: true,
      message: "Đã sắp xếp lại tất cả ID thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI SẮP XẾP ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function điền ID cho dữ liệu có sẵn (tùy chọn)
 */
function fillExistingData() {
  try {
    Logger.log("=== ĐIỀN ID CHO DỮ LIỆU CÓ SẴN ===");

    // Gọi function fillAllMissingIds từ schema.js
    fillAllMissingIds();

    Logger.log("=== HOÀN THÀNH ĐIỀN ID ===");

    return {
      success: true,
      message: "Đã điền ID cho dữ liệu có sẵn thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI ĐIỀN ID: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}
/**
 * Function thiết lập hệ thống Foreign Keys và Relationships
 */
function setupRelationships() {
  try {
    Logger.log("=== BẮT ĐẦU THIẾT LẬP RELATIONSHIPS ===");

    // Thiết lập foreign key dropdowns
    const dropdownResult = setupForeignKeyDropdowns();

    if (!dropdownResult) {
      throw new Error("Không thể thiết lập foreign key dropdowns");
    }

    // Thiết lập difficulty dropdowns
    setupDifficultyDropdowns();

    // Bỏ qua highlight theo yêu cầu user
    // highlightForeignKeyColumns();

    Logger.log("=== HOÀN THÀNH THIẾT LẬP RELATIONSHIPS ===");
    Logger.log("🎉 Foreign keys và Difficulty dropdowns đã được thiết lập!");

    return {
      success: true,
      message: "Đã thiết lập Foreign Keys và Difficulty Dropdowns thành công!",
    };
  } catch (error) {
    Logger.log("LỖI KHI THIẾT LẬP RELATIONSHIPS: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * Function test hệ thống relationships
 */
function testRelationships() {
  return testForeignKeySetup();
}

/**
 * Function refresh foreign key validations
 */
function refreshRelationships() {
  try {
    Logger.log("=== REFRESH RELATIONSHIPS ===");

    const result = refreshForeignKeyValidations();

    return {
      success: result,
      message: result
        ? "Đã refresh relationships thành công!"
        : "Lỗi khi refresh relationships",
    };
  } catch (error) {
    Logger.log("LỖI REFRESH RELATIONSHIPS: " + error.toString());
    return {
      success: false,
      message: "Lỗi: " + error.toString(),
    };
  }
}

/**
 * ========================================
 * AUTO EMAIL DETECTION FUNCTIONS
 * Sử dụng Session.getActiveUser().getEmail()
 * Không cần prompt email thủ công
 * ========================================
 */

/**
 * Lấy email của user hiện tại từ Google Account
 * @returns {string|null} Email hoặc null nếu không lấy được
 */
function getCurrentUserEmail() {
  try {
    const email = Session.getActiveUser().getEmail();

    if (!email || email === "") {
      Logger.log("⚠️ Không thể lấy email từ Session");
      return null;
    }

    Logger.log("✅ Đã lấy email: " + email);
    return email;
  } catch (error) {
    Logger.log("❌ Lỗi lấy email: " + error.toString());
    return null;
  }
}

/**
 * Lấy thông tin user hiện tại (cho client)
 * @returns {Object} Thông tin user hoặc thông báo lỗi
 */
function getCurrentUser() {
  try {
    const email = getCurrentUserEmail();

    if (!email) {
      return {
        success: false,
        message:
          "Không thể xác định email người dùng. Vui lòng đăng nhập Google Account.",
      };
    }

    // Tìm user trong database
    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Database chưa được khởi tạo",
      };
    }

    const data = usersSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: false,
        message: "Database chưa có dữ liệu",
        email: email,
      };
    }

    const headers = data[0];
    const emailIndex = headers.indexOf("email");

    if (emailIndex === -1) {
      return {
        success: false,
        message: "Cấu trúc database không đúng",
      };
    }

    // Tìm user theo email
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        return {
          success: true,
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            fullName: data[i][4],
            role: data[i][5],
            isActive: data[i][8],
          },
        };
      }
    }

    // User chưa tồn tại - trả về email để tự động đăng ký
    return {
      success: false,
      message: "Tài khoản chưa tồn tại. Vui lòng đăng ký.",
      email: email,
      autoRegister: true,
    };
  } catch (error) {
    Logger.log("❌ Lỗi getCurrentUser: " + error.toString());
    return {
      success: false,
      message: "Lỗi hệ thống: " + error.toString(),
    };
  }
}

/**
 * Đăng nhập tự động bằng Google Account
 * @returns {Object} Kết quả đăng nhập
 */
function autoLoginWithGoogle() {
  try {
    const email = getCurrentUserEmail();

    if (!email) {
      return {
        success: false,
        message:
          "Không thể xác định Google Account. Vui lòng đăng nhập vào Google.",
      };
    }

    // Tìm user trong database
    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Database chưa được khởi tạo",
      };
    }

    const data = usersSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: false,
        message: "Database chưa có dữ liệu",
        email: email,
        autoRegister: true,
      };
    }

    const headers = data[0];
    const emailIndex = headers.indexOf("email");
    const lastLoginIndex = headers.indexOf("lastLogin");

    // Tìm user theo email
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        // Kiểm tra tài khoản có active không
        const isActive = data[i][8];
        if (!isActive) {
          return {
            success: false,
            message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin.",
          };
        }

        // Cập nhật lastLogin
        const now = new Date();
        if (lastLoginIndex !== -1) {
          usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(now);
        }

        // Log activity
        logActivity(
          data[i][0],
          "Auto Login",
          "Logged in via Google Account: " + email
        );

        Logger.log("✅ Đăng nhập thành công: " + email);

        return {
          success: true,
          message: "Đăng nhập thành công! Chào mừng " + data[i][4],
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            fullName: data[i][4],
            role: data[i][5],
            spreadsheetId: data[i][9] || "",
          },
        };
      }
    }

    // User chưa tồn tại - đề xuất đăng ký
    Logger.log("⚠️ User chưa tồn tại: " + email);
    return {
      success: false,
      message: "Tài khoản chưa tồn tại",
      email: email,
      autoRegister: true,
    };
  } catch (error) {
    Logger.log("❌ Lỗi autoLoginWithGoogle: " + error.toString());
    return {
      success: false,
      message: "Lỗi đăng nhập: " + error.toString(),
    };
  }
}

/**
 * Đăng ký tự động với Google Account
 * @param {Object} userData - Thông tin bổ sung từ user (fullName, username)
 * @returns {Object} Kết quả đăng ký
 */
function autoRegisterWithGoogle(userData) {
  try {
    const email = getCurrentUserEmail();

    if (!email) {
      return {
        success: false,
        message:
          "Không thể xác định Google Account. Vui lòng đăng nhập vào Google.",
      };
    }

    const usersSheet = getSheet("Users");
    if (!usersSheet) {
      return {
        success: false,
        message: "Database chưa được khởi tạo",
      };
    }

    // Kiểm tra email đã tồn tại chưa
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf("email");

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        return {
          success: false,
          message: "Email đã được đăng ký. Vui lòng đăng nhập.",
        };
      }
    }

    // Tạo user mới
    const userId = generateNextId("Users", "USR");
    const username = userData.username || email.split("@")[0];
    const fullName = userData.fullName || username;
    const now = new Date();

    // Tạo User Progress Sheet riêng cho user
    const progressSheetId = createUserProgressSheet(userId, fullName);

    const newUser = [
      userId,
      username,
      email,
      "GOOGLE_AUTH", // Password hash - không cần password cho Google users
      fullName,
      userData.role || "student", // Default role
      now, // createdAt
      now, // lastLogin
      true, // isActive
      progressSheetId, // spreadsheetId
    ];

    // Thêm vào sheet
    usersSheet.appendRow(newUser);

    // Log activity
    logActivity(
      userId,
      "Auto Register",
      "Registered via Google Account: " + email
    );

    Logger.log("✅ Đăng ký thành công: " + email + " - " + userId);

    return {
      success: true,
      message: "Đăng ký thành công! Chào mừng " + fullName,
      user: {
        userId: userId,
        username: username,
        email: email,
        fullName: fullName,
        role: userData.role || "student",
        spreadsheetId: progressSheetId,
      },
    };
  } catch (error) {
    Logger.log("❌ Lỗi autoRegisterWithGoogle: " + error.toString());
    return {
      success: false,
      message: "Lỗi đăng ký: " + error.toString(),
    };
  }
}

/**
 * Tạo Progress Sheet riêng cho user
 * @param {string} userId - ID người dùng
 * @param {string} fullName - Tên đầy đủ
 * @returns {string} ID của spreadsheet
 */
function createUserProgressSheet(userId, fullName) {
  try {
    const sheetName = "Progress_" + userId;
    const ss = SpreadsheetApp.create(sheetName);
    const sheet = ss.getActiveSheet();

    // Đổi tên sheet
    sheet.setName("User_Progress");

    // Tạo headers
    const headers = [
      "progressId",
      "userId",
      "topicId",
      "activityType",
      "completedAt",
      "score",
      "timeSpent",
      "attempts",
      "isCompleted",
      "accuracyRate",
      "streakCount",
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.getRange(1, 1, 1, headers.length).setBackground("#34a853");
    sheet.getRange(1, 1, 1, headers.length).setFontColor("white");
    sheet.setFrozenRows(1);

    // Thêm note
    ss.addEditor(Session.getActiveUser().getEmail());
    ss.rename("Progress_" + fullName + "_" + userId);

    Logger.log("✅ Tạo Progress Sheet: " + ss.getId());

    return ss.getId();
  } catch (error) {
    Logger.log("❌ Lỗi tạo Progress Sheet: " + error.toString());
    return "";
  }
}

/**
 * Log activity vào Logs sheet
 * @param {string} userId - ID người dùng
 * @param {string} action - Hành động
 * @param {string} details - Chi tiết
 */
function logActivity(userId, action, details) {
  try {
    const logsSheet = getSheet("Logs");
    if (!logsSheet) {
      Logger.log("⚠️ Không tìm thấy Logs sheet");
      return;
    }

    const logId = generateNextId("Logs", "LOG");
    const now = new Date();

    const logEntry = [
      logId,
      now,
      "INFO",
      "USER",
      userId,
      action,
      details,
      "", // IP address - không lấy được trong Apps Script
      "", // User agent - không lấy được trong Apps Script
      Session.getTemporaryActiveUserKey() || "", // Session ID
    ];

    logsSheet.appendRow(logEntry);
    Logger.log("✅ Logged activity: " + action);
  } catch (error) {
    Logger.log("❌ Lỗi log activity: " + error.toString());
  }
}

/**
 * Lấy helper function getSheet
 * @param {string} sheetName - Tên sheet
 * @returns {Sheet|null} Sheet object hoặc null
 */
function getSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    return ss.getSheetByName(sheetName);
  } catch (error) {
    Logger.log("❌ Lỗi getSheet: " + error.toString());
    return null;
  }
}

/**
 * ========================================
 * TEST FUNCTIONS
 * ========================================
 */

/**
 * Test lấy email hiện tại
 */
function testGetCurrentUserEmail() {
  const email = getCurrentUserEmail();
  Logger.log("Current Email: " + email);
  return email;
}

/**
 * Test lấy thông tin user hiện tại
 */
function testGetCurrentUser() {
  const result = getCurrentUser();
  Logger.log("Current User Result: " + JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test auto login
 */
function testAutoLogin() {
  const result = autoLoginWithGoogle();
  Logger.log("Auto Login Result: " + JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test auto register
 */
function testAutoRegister() {
  const userData = {
    fullName: "Test User",
    username: "testuser",
  };
  const result = autoRegisterWithGoogle(userData);
  Logger.log("Auto Register Result: " + JSON.stringify(result, null, 2));
  return result;
}

/**
 * ========================================
 * NEW AUTHENTICATION FUNCTIONS
 * Wrapper functions cho authService.js
 * ========================================
 */

/**
 * Đăng ký với Email & Password
 * @param {Object} userData - {email, password, confirmPassword, fullName}
 * @returns {Object} Result
 */
function registerWithEmailPassword(userData) {
  return registerWithEmail(userData);
}

/**
 * Xác thực email
 * @param {string} token - Verification token
 * @returns {Object} Result
 */
function verifyEmailToken(token) {
  return verifyEmail(token);
}

/**
 * Đăng nhập với Email & Password
 * @param {Object} credentials - {email, password}
 * @returns {Object} Result
 */
function loginWithEmailPassword(credentials) {
  return loginWithEmail(credentials);
}

/**
 * Đăng nhập với Google OAuth2
 * Tự động provision nếu user chưa tồn tại
 * @returns {Object} Result
 */
function loginWithGoogleOAuth() {
  return loginWithGoogle();
}

/**
 * Yêu cầu reset password
 * @param {string} email - Email
 * @returns {Object} Result
 */
function requestResetPassword(email) {
  return requestPasswordReset(email);
}

/**
 * Reset password với token
 * @param {Object} data - {token, newPassword, confirmPassword}
 * @returns {Object} Result
 */
function resetPasswordWithToken(data) {
  return resetPassword(data);
}

/**
 * Gửi lại email xác thực
 * @param {string} email - Email
 * @returns {Object} Result
 */
function resendVerificationEmailToUser(email) {
  return resendVerificationEmail(email);
}
