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
        message: "Định dạng ảnh không được hỗ trợ"
      };
    }

    var bytes = Utilities.base64Decode(payload.base64);

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

    var safeName = originalName
      .replace(/[^\w.\-]+/g, "_")
      .substring(0, 100);

    var finalName =
      "COURSE_" +
      new Date().getTime() +
      "_" +
      safeName;

    var blob = Utilities.newBlob(
      bytes,
      mimeType,
      finalName
    );

    /*
     * Nên tạo riêng một thư mục Drive chứa ảnh khóa học,
     * sau đó điền ID thư mục tại đây.
     */
    var folderId = "1nrcuio2Da7Zc3bij2HO4b7P8a-_053LN";

    if (
      !folderId ||
      folderId === "DAN_ID_THU_MUC_DRIVE_VAO_DAY"
    ) {
      return {
        success: false,
        message:
          "Chưa cấu hình thư mục lưu ảnh khóa học"
      };
    }

    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);

    /*
     * Ảnh phải có quyền xem bằng liên kết để hiển thị
     * trên thẻ khóa học.
     */
    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

    var fileId = file.getId();

    var imageUrl =
      "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(fileId) +
      "&sz=w1200";

    return {
      success: true,
      message: "Tải ảnh thành công",
      url: imageUrl,
      fileId: fileId
    };
  } catch (error) {
    Logger.log(
      "[uploadCourseThumbnail] " +
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
            : error
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
