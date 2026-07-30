function normalizeMigrationCourseName_(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

/**
 * migrateCourses.js
 * 
 * Script to migrate from legacy 'course' string column in Topics
 * to a dedicated 'Courses' sheet with relational 'courseId'.
 */

function migrateCourseStructure() {
  let backupFileId = "";
  try {
    var DB_CONFIG = typeof getDatabaseConfig === 'function' ? getDatabaseConfig() : { SPREADSHEET_ID: "1_2K0qAot5q7Q8VpY8rG8LqCjA9iG1fG8F3A2V8I9_0A" };
    const sourceFile = DriveApp.getFileById(DB_CONFIG.SPREADSHEET_ID);
    const backupName = "MASTER_DB_BACKUP_" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMdd_HHmmss");
    const backupFile = sourceFile.makeCopy(backupName);
    backupFileId = backupFile.getId();
    Logger.log("Created backup: " + backupFileId);
  } catch (backupError) {
    return {
      success: false,
      step: "CREATE_BACKUP",
      message: "Không thể tạo backup: " + backupError.toString()
    };
  }
  Logger.log("Starting Course Structure Migration...");
  
  if (typeof DB_CONFIG === 'undefined' || !DB_CONFIG || !DB_CONFIG.SPREADSHEET_ID) {
    Logger.log("ERROR: DB_CONFIG or DB_CONFIG.SPREADSHEET_ID not found.");
    return;
  }
  
  const ss = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
  
  // 1. Ensure Courses sheet exists
  const coursesSchema = DB_CONFIG.SHEETS.COURSES;
  let coursesSheet = ss.getSheetByName(coursesSchema.name);
  if (!coursesSheet) {
    Logger.log("Creating Courses sheet...");
    coursesSheet = ss.insertSheet(coursesSchema.name);
    coursesSheet.appendRow(coursesSchema.columns);
    // Optional: Format header
    coursesSheet.getRange(1, 1, 1, coursesSchema.columns.length).setFontWeight("bold").setBackground("#f3f3f3");
    coursesSheet.setFrozenRows(1);
  } else {
    // Ensure all columns exist without calling updateSheetSchema
    const existingHeaders = coursesSheet.getRange(1, 1, 1, coursesSheet.getLastColumn()).getValues()[0];
    const missingHeaders = coursesSchema.columns.filter(col => !existingHeaders.includes(col));
    if (missingHeaders.length > 0) {
      coursesSheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }
  
  // 2. Ensure courseId column exists in Topics sheet
  const topicsSchema = DB_CONFIG.SHEETS.TOPICS;
  let topicsSheet = ss.getSheetByName(topicsSchema.name);
  if (!topicsSheet) {
    Logger.log("ERROR: Topics sheet not found!");
    return;
  }
  
  let headers = topicsSheet.getRange(1, 1, 1, topicsSheet.getLastColumn() || 1).getValues()[0];
  let courseIdIndex = headers.indexOf('courseId');
  let oldCourseIndex = headers.indexOf('course');
  
  if (courseIdIndex === -1) {
    Logger.log("CRITICAL: courseId column not found in Topics. Inserting...");
    
    // Auto insert column at index 2 (B)
    topicsSheet.insertColumnAfter(1);
    topicsSheet.getRange(1, 2).setValue('courseId');
    courseIdIndex = 1; // 0-indexed for arrays later
    Logger.log("Inserted courseId column at position 2");
    
    // TRỌNG YẾU: Cập nhật lại mảng headers sau khi chèn cột!
    headers = topicsSheet.getRange(1, 1, 1, topicsSheet.getLastColumn()).getValues()[0];
    oldCourseIndex = headers.indexOf('course');
  }
  
  if (oldCourseIndex === -1) {
    Logger.log("WARNING: Old 'course' column not found. Maybe migration was already run?");
  }
  
  // 3. Read existing Topics data
  const data = topicsSheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log("No data in Topics sheet.");
    return;
  }
  
  const topicsData = data.slice(1);
  const uniqueCourses = new Map();
  
  if (oldCourseIndex !== -1) {
    topicsData.forEach(row => {
      const displayName = String(row[oldCourseIndex] || '').trim().replace(/\s+/g, " ");
      if (!displayName || displayName === "DUMMY_COURSE_HOLDER") {
        return;
      }
      const normalizedName = normalizeMigrationCourseName_(displayName);
      if (!uniqueCourses.has(normalizedName)) {
        uniqueCourses.set(normalizedName, displayName);
      }
    });
  }
  
  Logger.log(`Found ${uniqueCourses.size} unique courses.`);
  
  // 4. Create course records in Courses sheet
  const existingCoursesData = coursesSheet.getDataRange().getValues();
  const actualCourseHeaders = existingCoursesData[0] || coursesSchema.columns;
  const courseIdCol = actualCourseHeaders.indexOf('courseId');
  const courseTitleCol = actualCourseHeaders.indexOf('title');
  const courseOrderCol = actualCourseHeaders.indexOf('order');
  
  const existingNormalizedTitles = new Set();
  const courseMap = {}; // { 'Course Name': 'CRSxxx' }
  
  existingCoursesData.slice(1).forEach(row => {
    if (courseTitleCol !== -1 && row[courseTitleCol]) {
      const t = String(row[courseTitleCol]).trim();
      existingNormalizedTitles.add(normalizeMigrationCourseName_(t));
      if (courseIdCol !== -1 && row[courseIdCol]) {
        courseMap[normalizeMigrationCourseName_(t)] = String(row[courseIdCol]).trim();
      }
    }
  });
  

  // Ensure CRS_UNCATEGORIZED exists
  const hasFallbackId = Object.values(courseMap).indexOf('CRS_UNCATEGORIZED') !== -1;
  if (!hasFallbackId) {
    const newRow = actualCourseHeaders.map(function(header) {
      if (header === "courseId") return "CRS_UNCATEGORIZED";
      if (header === "title") return "Chưa phân loại";
      if (header === "status") return "hidden";
      if (header === "order") return 999;
      if (header === "createdAt" || header === "updatedAt") return new Date().toISOString();
      return "";
    });
    coursesSheet.appendRow(newRow);
    courseMap[normalizeMigrationCourseName_("Chưa phân loại")] = "CRS_UNCATEGORIZED";
    existingNormalizedTitles.add(normalizeMigrationCourseName_("Chưa phân loại"));
    Logger.log("Created fallback course: CRS_UNCATEGORIZED");
  }
  
  let newCoursesAdded = 0;
  let nextOrder = 1;
  existingCoursesData.slice(1).forEach(function(row) {
    const order = parseInt(row[courseOrderCol], 10);
    if (Number.isInteger(order) && order >= nextOrder && order < 999) {
      nextOrder = order + 1;
    }
  });
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000);
    lockAcquired = true;
    uniqueCourses.forEach(function(displayName, normalizedName) {
      if (!existingNormalizedTitles.has(normalizedName) && normalizedName !== normalizeMigrationCourseName_("Chưa phân loại")) {
        const newCourseId = generateNextId(coursesSheet, coursesSchema.idPrefix || "CRS");
        if (!newCourseId) {
          throw new Error('Không thể tạo ID cho khóa: ' + displayName);
        }
        const newRow = actualCourseHeaders.map(function(header) {
          if (header === "courseId") return newCourseId;
          if (header === "title") return displayName;
          if (header === "status") return "published";
          if (header === "order") return nextOrder++;
          if (header === "createdAt" || header === "updatedAt") return new Date().toISOString();
          return "";
        });
        
        coursesSheet.appendRow(newRow);
        courseMap[normalizedName] = newCourseId;
        existingNormalizedTitles.add(normalizedName);
        newCoursesAdded++;
      }
    });
  } catch (error) {
    Logger.log('Course migration stopped: ' + error.toString());
    return {
      success: false,
      step: 'CREATE_COURSES',
      message: error.toString()
    };
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
  
  Logger.log(`Added ${newCoursesAdded} new courses to Courses sheet.`);
  
  const unmappedCourses = Array.from(uniqueCourses.keys()).filter(function(normalizedName) {
    return !courseMap[normalizedName] && normalizedName !== normalizeMigrationCourseName_('DUMMY_COURSE_HOLDER');
  });

  if (unmappedCourses.length > 0) {
    return {
      success: false,
      step: 'VERIFY_COURSE_MAP',
      message: 'Còn khóa học chưa được ánh xạ: ' + unmappedCourses.join(', ')
    };
  }
  
  // 5. Update every real topic with courseId and delete dummy holders
  let rowsToDelete = [];
  let updates = 0;
  
  const refreshedCoursesData = coursesSheet.getDataRange().getValues();
  const refreshedCourseHeaders = refreshedCoursesData[0];
  const refreshedCourseIdIndex = refreshedCourseHeaders.indexOf("courseId");

  if (refreshedCourseIdIndex < 0) {
    return {
      success: false,
      step: "BUILD_VALID_COURSE_IDS",
      message: "Sheet Courses thiếu cột courseId."
    };
  }

  const validCourseIds = new Set(
    refreshedCoursesData.slice(1).map(function(row) {
      return String(row[refreshedCourseIdIndex] || "").trim();
    }).filter(Boolean)
  );

  // We process from bottom to top so deleting rows doesn't mess up indices
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const topicIdIndex = headers.indexOf('topicId');
    const titleIndex = headers.indexOf('title');
    const topicId = String(row[topicIdIndex] || '');
    const title = String(row[titleIndex] || '');
    
    // Check for dummy holder
    if (title === 'DUMMY_COURSE_HOLDER' && topicId.startsWith('course_holder_')) {
      rowsToDelete.push(i + 1); // +1 because sheet rows are 1-indexed
      continue;
    }
    
    // Update courseId
    if (courseIdIndex !== -1) {
      const oldCourseName = oldCourseIndex !== -1 ? String(row[oldCourseIndex] || '').trim() : '';
      const currentCourseId = String(row[courseIdIndex] || '').trim();
      
      const hasValidCourseId = currentCourseId && validCourseIds.has(currentCourseId);
      if (!hasValidCourseId) {
        const normalizedOldName = normalizeMigrationCourseName_(oldCourseName);
        const mappedId = (normalizedOldName && courseMap[normalizedOldName]) ? courseMap[normalizedOldName] : "CRS_UNCATEGORIZED";
        topicsSheet.getRange(i + 1, courseIdIndex + 1).setValue(mappedId);
        updates++;
      }
    }
  }
  
  Logger.log(`Updated courseId for ${updates} topics.`);
  
  // 6. Delete dummy holders
  if (rowsToDelete.length > 0) {
    Logger.log(`Deleting ${rowsToDelete.length} dummy rows...`);
    rowsToDelete.forEach(rowNum => {
      topicsSheet.deleteRow(rowNum);
    });
  }
  
  const verification = verifyCourseMigration_(coursesSheet, topicsSheet);
  
  if (!verification.success) {
    Logger.log("Migration integrity check failed: " + JSON.stringify(verification));
    return {
      success: false,
      step: "FINAL_INTEGRITY_CHECK",
      details: verification
    };
  }

  try {
    if (typeof clearCourseStructureCaches === 'function') {
      clearCourseStructureCaches();
    } else if (typeof clearTopicsCache === 'function') {
      clearTopicsCache();
    }
  } catch (e) {
    Logger.log("Failed to clear cache: " + e.toString());
  }

  Logger.log("Migration completed successfully!");
  return {
    success: true,
    backupSpreadsheetId: backupFileId,
    coursesAdded: newCoursesAdded,
    topicsUpdated: updates,
    dummyRowsDeleted: rowsToDelete.length,
    verification: verification
  };
}


function verifyCourseMigration_(coursesSheet, topicsSheet) {
  const coursesData = coursesSheet.getDataRange().getValues();
  const topicsData = topicsSheet.getDataRange().getValues();

  const courseHeaders = coursesData[0];
  const topicHeaders = topicsData[0];

  const courseIdIndex = courseHeaders.indexOf("courseId");
  const topicCourseIdIndex = topicHeaders.indexOf("courseId");
  const topicIdIndex = topicHeaders.indexOf("topicId");
  const titleIndex = topicHeaders.indexOf("title");

  const courseIds = coursesData.slice(1).map(row => String(row[courseIdIndex] || "").trim()).filter(Boolean);
  const validCourseIdsVerify = new Set(courseIds);
  const duplicateCourseIds = courseIds.filter((id, index) => courseIds.indexOf(id) !== index);

  const blankCourseTopics = [];
  const orphanTopics = [];
  const dummyRows = [];
  const topicIds = [];

  topicsData.slice(1).forEach(function(row, index) {
    const topicId = String(row[topicIdIndex] || "").trim();
    const courseId = String(row[topicCourseIdIndex] || "").trim();
    const title = String(row[titleIndex] || "").trim();

    if (topicId) topicIds.push(topicId);

    if (!courseId) {
      blankCourseTopics.push(topicId || "row_" + (index + 2));
    } else if (!validCourseIdsVerify.has(courseId)) {
      orphanTopics.push({ topicId: topicId, courseId: courseId });
    }

    if (title === "DUMMY_COURSE_HOLDER") dummyRows.push(index + 2);
  });

  const duplicateTopicIds = topicIds.filter((id, index) => topicIds.indexOf(id) !== index);

  const success = duplicateCourseIds.length === 0 &&
                  duplicateTopicIds.length === 0 &&
                  blankCourseTopics.length === 0 &&
                  orphanTopics.length === 0 &&
                  dummyRows.length === 0;

  return {
    success: success,
    duplicateCourseIds: [...new Set(duplicateCourseIds)],
    duplicateTopicIds: [...new Set(duplicateTopicIds)],
    blankCourseTopics: blankCourseTopics,
    orphanTopics: orphanTopics,
    dummyRows: dummyRows
  };
}
