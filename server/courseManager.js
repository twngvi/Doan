// COURSE CRUD & ORDER HELPERS (MIGRATION)
// ==========================================

function normalizeCourseTitle_(title) {
  if (!title) return "";
  return String(title).trim().replace(/\s+/g, ' ').toLowerCase();
}

function courseTitleExists_(sheet, headers, title, excludeId) {
  const data = sheet.getDataRange().getValues();
  const normalizedTitle = normalizeCourseTitle_(title);
  const titleIdx = headers.indexOf('title');
  const idIdx = headers.indexOf('courseId');
  if (titleIdx < 0) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (excludeId && idIdx >= 0 && data[i][idIdx] === excludeId) continue;
    if (normalizeCourseTitle_(data[i][titleIdx]) === normalizedTitle) {
      return true;
    }
  }
  return false;
}

function courseExists_(courseId) {
  if (!courseId) return false;
  const sheet = getSheet('Courses');
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('courseId');
  if (idIdx < 0) return false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === courseId) return true;
  }
  return false;
}

function validateCourseData(courseData) {
  if (!courseData.title || !String(courseData.title).trim()) return "T뿯½뿯½n kh뿯½뿯½a h뿯½뿯½뿯½c kh뿯½뿯½ng 뿯½‘뿯½뿯½뿯½뿯½뿯½c 뿯½‘뿯½뿯½뿯ƽ tr뿯½뿯½‘ng";
  return null;
}

function createCourse(courseData) {
  const auth = (typeof requireAdminContext_ === 'function') ? requireAdminContext_() : {success: true};
  if (!auth.success) return auth;
  const error = (typeof validateCourseData === 'function') ? validateCourseData(courseData) : null;
  if (error) return { success: false, message: error };
  let lockAcquired = false;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    lockAcquired = true;
    const sheet = (typeof getSheet === 'function') ? getSheet('Courses') : SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Courses');
    if (!sheet) return { success: false, message: 'Sheet Courses not found' };
    const headers = sheet.getDataRange().getValues()[0];
    
    if (typeof courseTitleExists_ === 'function' && courseTitleExists_(sheet, headers, courseData.title)) {
       return { success: false, message: 'Course title already exists.' };
    }
    
    const newCourseId = 'CRS_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
    const newRow = headers.map(function(h) {
      switch(h) {
        case 'courseId': return newCourseId;
        case 'title': return String(courseData.title || '').trim();
        case 'shortDescription': return courseData.shortDescription || '';
        case 'description': return courseData.description || '';
        case 'thumbnailUrl': return courseData.thumbnailUrl || '';
        case 'level': return courseData.level || 'beginner';
        case 'category': return courseData.category || '';
        case 'status': return courseData.status || 'draft';
        case 'order': return parseInt(courseData.order, 10) || 999;
        case 'createdAt':
        case 'updatedAt': return new Date().toISOString();
        case 'createdBy': return auth.userId || 'ADMIN';
        default: return '';
      }
    });
    sheet.appendRow(newRow);
    if (typeof clearCourseStructureCaches === 'function') clearCourseStructureCaches();
    return { success: true, message: 'Course created successfully', courseId: newCourseId };
  } catch (e) {
    return { success: false, message: 'Error creating course: ' + e.toString() };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function updateCourse(courseId, courseData) {
  courseData = courseData || {};
  courseData.courseId = String(courseId || "").trim();
  const auth = requireAdminContext_();
  if (!auth.success) return auth;
  if (!courseData.courseId) return { success: false, message: "Thiếu courseId" };
  
  const error = validateCourseData(courseData);
  if (error) return { success: false, message: error };
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000);
    lockAcquired = true;
    const sheet = getSheet("Courses");
    if (!sheet) return { success: false, message: "Không tìm thấy sheet Courses" };
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf("courseId");
    if (courseTitleExists_(sheet, headers, courseData.title, courseData.courseId)) {
       return { success: false, message: "Tên khóa học đã bị trùng với khóa khác." };
    }
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === courseData.courseId) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) return { success: false, message: "Không tìm thấy khóa học" };
    
    const updateMap = {
      title: String(courseData.title || "").trim(),
      shortDescription: courseData.shortDescription,
      description: courseData.description,
      category: courseData.category,
      level: courseData.level,
      thumbnailUrl: courseData.thumbnailUrl,
      status: courseData.status,
      order: courseData.order,
      updatedAt: new Date().toISOString()
    };
    for (const key in updateMap) {
      if (updateMap[key] !== undefined) {
        let colIdx = headers.indexOf(key);
        if (colIdx === -1) {
           colIdx = headers.length;
           sheet.getRange(1, colIdx + 1).setValue(key);
           headers.push(key);
        }
        sheet.getRange(rowIndex, colIdx + 1).setValue(updateMap[key]);
      }
    }
    if (typeof clearCourseStructureCaches === "function") clearCourseStructureCaches();
    return { success: true, message: "Cập nhật khóa học thành công" };
  } catch(e) {
    return { success: false, message: "Lỗi cập nhật: " + e.toString() };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

const COURSE_IMAGE_FOLDER_ID =
  "1nrcuio2Da7Zc3bij2HO4b7P8a-_053LN";

function uploadCourseThumbnail(payload) {
  try {
    if (!payload || !payload.base64) {
      return {
        success: false,
        message: "Không nhận được dữ liệu ảnh"
      };
    }

    var mimeType = String(
      payload.mimeType || ""
    ).toLowerCase();

    var allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (allowedTypes.indexOf(mimeType) === -1) {
      return {
        success: false,
        message:
          "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP"
      };
    }

    var bytes;

    try {
      bytes = Utilities.base64Decode(
        payload.base64
      );
    } catch (decodeError) {
      return {
        success: false,
        message: "Dữ liệu ảnh không hợp lệ"
      };
    }

    var maxSize = 3 * 1024 * 1024;

    if (bytes.length > maxSize) {
      return {
        success: false,
        message: "Ảnh không được vượt quá 3 MB"
      };
    }

    var originalName = String(
      payload.fileName || "course-image"
    );

    var extension = "";

    if (mimeType === "image/jpeg") {
      extension = ".jpg";
    } else if (mimeType === "image/png") {
      extension = ".png";
    } else if (mimeType === "image/webp") {
      extension = ".webp";
    }

    var nameWithoutExtension = originalName
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "_")
      .substring(0, 80);

    var finalName =
      "COURSE_" +
      new Date().getTime() +
      "_" +
      nameWithoutExtension +
      extension;

    var blob = Utilities.newBlob(
      bytes,
      mimeType,
      finalName
    );

    /*
     * BƯỚC 1: Kiểm tra quyền truy cập thư mục.
     */
    var folder;

    try {
      folder = DriveApp.getFolderById(
        COURSE_IMAGE_FOLDER_ID
      );

      // Buộc Apps Script kiểm tra quyền đọc thư mục.
      folder.getName();
    } catch (folderError) {
      Logger.log(
        "[uploadCourseThumbnail] Folder access error: " +
        folderError
      );

      return {
        success: false,
        code: "DRIVE_FOLDER_ACCESS_DENIED",
        message:
          "Tài khoản thực thi Web App không có quyền truy cập " +
          "thư mục lưu ảnh. Hãy cấp quyền chỉnh sửa thư mục cho " +
          "tài khoản đã triển khai Web App và cấp quyền DriveApp."
      };
    }

    /*
     * BƯỚC 2: Tạo file trong thư mục.
     */
    var file;

    try {
      file = folder.createFile(blob);
    } catch (createError) {
      Logger.log(
        "[uploadCourseThumbnail] Create file error: " +
        createError
      );

      return {
        success: false,
        code: "DRIVE_CREATE_FILE_FAILED",
        message:
          "Không thể tạo ảnh trong thư mục Drive: " +
          (
            createError && createError.message
              ? createError.message
              : createError
          )
      };
    }

    /*
     * Thư mục đã được chia sẻ bằng liên kết nên file mới
     * sẽ nhận quyền kế thừa từ thư mục.
     *
     * setSharing có thể bị chặn bởi chính sách tài khoản,
     * vì vậy lỗi ở bước này không được làm hỏng toàn bộ upload.
     */
    var sharingWarning = "";

    try {
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
    } catch (sharingError) {
      sharingWarning =
        sharingError && sharingError.message
          ? sharingError.message
          : String(sharingError);

      Logger.log(
        "[uploadCourseThumbnail] Sharing warning: " +
        sharingWarning
      );
    }

    var fileId = file.getId();

    var imageUrl =
      "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(fileId) +
      "&sz=w1200";

    return {
      success: true,
      message: sharingWarning
        ? "Đã tải ảnh lên. File đang sử dụng quyền kế thừa từ thư mục."
        : "Tải ảnh thành công",
      url: imageUrl,
      fileId: fileId,
      sharingWarning: sharingWarning
    };

  } catch (error) {
    Logger.log(
      "[uploadCourseThumbnail] Unexpected error: " +
      (
        error && error.stack
          ? error.stack
          : error
      )
    );

    return {
      success: false,
      message:
        "Không thể tải ảnh lên: " +
        (
          error && error.message
            ? error.message
            : String(error)
        )
    };
  }
}

function removeDummyCourseHolders() {
  const sheet = getSheet("Topics");
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, deleted: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const topicIdIndex = headers.indexOf("topicId");
  const titleIndex = headers.indexOf("title");
  let deleted = 0;

  for (let index = data.length - 1; index >= 1; index--) {
    const topicId = topicIdIndex >= 0 ? String(data[index][topicIdIndex] || "").trim() : "";
    const title = titleIndex >= 0 ? String(data[index][titleIndex] || "").trim() : "";
    const isDummy = title === "DUMMY_COURSE_HOLDER" || topicId.indexOf("course_holder_") === 0;

    if (isDummy) {
      sheet.deleteRow(index + 1);
      deleted++;
    }
  }

  if (typeof clearCourseStructureCaches === "function") {
    clearCourseStructureCaches();
  }

  return { success: true, deleted: deleted };
}

function closeOrderGapInCourse(sheet, headers, data, courseId, oldOrder, excludeTopicId) {
  const courseIdIdx = headers.indexOf('courseId');
  const orderIdx = headers.indexOf('order');
  const topicIdIdx = headers.indexOf('topicId');
  if (courseIdIdx < 0 || orderIdx < 0) return;
  for (let i = 1; i < data.length; i++) {
    const rowCourse = String(data[i][courseIdIdx] || "").trim();
    if (rowCourse === courseId) {
      if (excludeTopicId && data[i][topicIdIdx] === excludeTopicId) continue;
      const currentOrder = parseInt(data[i][orderIdx], 10);
      if (Number.isInteger(currentOrder) && currentOrder > oldOrder && currentOrder < 999) {
        sheet.getRange(i + 1, orderIdx + 1).setValue(currentOrder - 1);
        data[i][orderIdx] = currentOrder - 1;
      }
    }
  }
}

function makeOrderRoomInCourse(sheet, headers, data, courseId, newOrder, excludeTopicId) {
  const courseIdIdx = headers.indexOf('courseId');
  const orderIdx = headers.indexOf('order');
  const topicIdIdx = headers.indexOf('topicId');
  if (courseIdIdx < 0 || orderIdx < 0) return;
  for (let i = 1; i < data.length; i++) {
    const rowCourse = String(data[i][courseIdIdx] || "").trim();
    if (rowCourse === courseId) {
      if (excludeTopicId && data[i][topicIdIdx] === excludeTopicId) continue;
      const currentOrder = parseInt(data[i][orderIdx], 10);
      if (Number.isInteger(currentOrder) && currentOrder >= newOrder && currentOrder < 999) {
        sheet.getRange(i + 1, orderIdx + 1).setValue(currentOrder + 1);
        data[i][orderIdx] = currentOrder + 1;
      }
    }
  }
}

function shiftTopicOrdersInCourse(sheet, headers, data, courseId, newOrder, oldOrder, excludeTopicId) {
  if (newOrder === oldOrder) return;
  const courseIdIdx = headers.indexOf('courseId');
  const orderIdx = headers.indexOf('order');
  const topicIdIdx = headers.indexOf('topicId');
  if (courseIdIdx < 0 || orderIdx < 0) return;
  for (let i = 1; i < data.length; i++) {
    const rowCourse = String(data[i][courseIdIdx] || "").trim();
    if (rowCourse === courseId) {
      if (excludeTopicId && data[i][topicIdIdx] === excludeTopicId) continue;
      const currentOrder = parseInt(data[i][orderIdx], 10);
      if (!Number.isInteger(currentOrder) || currentOrder >= 999) continue;
      
      if (oldOrder < newOrder) {
        if (currentOrder > oldOrder && currentOrder <= newOrder) {
          sheet.getRange(i + 1, orderIdx + 1).setValue(currentOrder - 1);
          data[i][orderIdx] = currentOrder - 1;
        }
      } else {
        if (currentOrder >= newOrder && currentOrder < oldOrder) {
          sheet.getRange(i + 1, orderIdx + 1).setValue(currentOrder + 1);
          data[i][orderIdx] = currentOrder + 1;
        }
      }
    }
  }
}

function authorizeCourseThumbnailDrive() {
  var folder = DriveApp.getFolderById(
    COURSE_IMAGE_FOLDER_ID
  );

  var folderName = folder.getName();

  Logger.log(
    "Đã truy cập thư mục ảnh khóa học: " +
    folderName
  );

  return {
    success: true,
    folderId: COURSE_IMAGE_FOLDER_ID,
    folderName: folderName
  };
}

/**
 * Delete a course and all its topics
 * @param {string} courseId - ID of the course to delete
 */
function deleteCourseAndTopics(courseId) {
  try {
    const auth = (typeof requireAdminContext_ === 'function') ? requireAdminContext_() : (typeof getCurrentAdminContext === 'function' ? getCurrentAdminContext() : {success: true});
    if (!auth.success) return auth;

    if (!courseId) return { success: false, message: "Thiếu courseId" };

    // 1. Delete Topics
    const topicsSheet = (typeof getSheet === 'function') ? getSheet("Topics") : SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Topics");
    if (topicsSheet) {
      const topicsData = topicsSheet.getDataRange().getValues();
      const topicsHeaders = topicsData[0];
      const t_courseIdIdx = topicsHeaders.indexOf("courseId");
      const t_contentDocIdIdx = topicsHeaders.indexOf("contentDocId");
      
      if (t_courseIdIdx >= 0) {
        // Collect topic rows to delete (from bottom to top)
        let rowsToDelete = [];
        let docsToTrash = [];
        for (let i = topicsData.length - 1; i >= 1; i--) {
          if (topicsData[i][t_courseIdIdx] === courseId) {
            rowsToDelete.push(i + 1);
            if (t_contentDocIdIdx >= 0 && topicsData[i][t_contentDocIdIdx]) {
              docsToTrash.push(topicsData[i][t_contentDocIdIdx]);
            }
          }
        }
        
        // Trash docs
        docsToTrash.forEach(function(docId) {
          try {
            DriveApp.getFileById(docId).setTrashed(true);
          } catch(e) {}
        });
        
        // Delete rows (must delete from bottom to top so indices don't shift)
        rowsToDelete.forEach(function(rIdx) {
          topicsSheet.deleteRow(rIdx);
        });
      }
    }
    
    // 2. Delete Course
    const coursesSheet = (typeof getSheet === 'function') ? getSheet("Courses") : SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Courses");
    if (!coursesSheet) return { success: false, message: "Không tìm thấy sheet Courses" };
    
    const coursesData = coursesSheet.getDataRange().getValues();
    const coursesHeaders = coursesData[0];
    const c_courseIdIdx = coursesHeaders.indexOf("courseId");
    
    if (c_courseIdIdx < 0) return { success: false, message: "Lỗi cấu trúc sheet Courses" };
    
    let courseRowIndex = -1;
    let courseTitle = "";
    const c_titleIdx = coursesHeaders.indexOf("title");
    
    for (let i = 1; i < coursesData.length; i++) {
      if (coursesData[i][c_courseIdIdx] === courseId) {
        courseRowIndex = i + 1;
        if (c_titleIdx >= 0) {
          courseTitle = coursesData[i][c_titleIdx];
        }
        break;
      }
    }
    
    if (courseRowIndex === -1) {
      return { success: false, message: "Không tìm thấy khóa học để xóa" };
    }
    
    coursesSheet.deleteRow(courseRowIndex);
    
    if (typeof clearCourseStructureCaches === 'function') clearCourseStructureCaches();
    try { if (typeof clearTopicsCache === 'function') clearTopicsCache(); } catch (cacheError) {}
    
    return { success: true, message: "Đã xóa khóa học " + (courseTitle ? '"' + courseTitle + '"' : "") + " và các bài học bên trong thành công!" };
  } catch(e) {
    return { success: false, message: "Lỗi khi xóa khóa học: " + e.toString() };
  }
}

