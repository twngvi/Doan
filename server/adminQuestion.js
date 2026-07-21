/**
 * adminQuestion.js - Admin Quiz Question Management
 * 
 * Handles Admin flow for generating AI questions, reviewing, and saving them.
 */

/**
 * Get topics with their question stats and quiz status
 * Returns array of topics for the admin question manager
 */
function adminGetTopicsWithQuizStatus() {
  try {
    const topicsResult = typeof getAllTopicsIncludingHidden === 'function' ? getAllTopicsIncludingHidden() : getAllTopics();
    if (!topicsResult.success) {
      return topicsResult;
    }

    const ss = getOrCreateDatabase();
    const mcqSheet = ss.getSheetByName("MCQ_Questions");
    
    // Default to empty array if sheet doesn't exist
    let mcqData = [];
    if (mcqSheet) {
      mcqData = mcqSheet.getDataRange().getValues();
    }
    
    const headers = mcqData.length > 0 ? mcqData[0] : [];
    const topicIdCol = headers.indexOf("topicId");
    const statusCol = headers.indexOf("status");
    
    const topics = topicsResult.topics.map(topic => {
      // Calculate question stats for this topic
      let approvedCount = 0;
      let draftCount = 0;
      let totalCount = 0;
      
      if (mcqData.length > 1 && topicIdCol >= 0) {
        const targetTopicId = String(topic.topicId).trim();
        for (let i = 1; i < mcqData.length; i++) {
          const rowTopicId = String(mcqData[i][topicIdCol]).trim();
          if (rowTopicId === targetTopicId && rowTopicId !== "") {
            totalCount++;
            if (statusCol >= 0) {
              const qStatus = String(mcqData[i][statusCol]).trim().toLowerCase();
              if (qStatus === "approved") approvedCount++;
              else if (qStatus === "draft") draftCount++;
            } else {
              // If status column doesn't exist yet, consider them approved for backward compatibility
              approvedCount++;
            }
          }
        }
      }
      
      return {
        ...topic,
        questionStats: {
          total: totalCount,
          approved: approvedCount,
          draft: draftCount
        }
      };
    });
    
    return {
      success: true,
      topics: topics
    };
  } catch (error) {
    Logger.log("Error in adminGetTopicsWithQuizStatus: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Update topic's quizStatus
 */
function adminUpdateTopicQuizStatus(topicId, newStatus) {
  try {
    const ss = getOrCreateDatabase();
    const topicSheet = ss.getSheetByName("Topics");
    if (!topicSheet) return { success: false, message: "Topics sheet not found" };
    
    const data = topicSheet.getDataRange().getValues();
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const quizStatusCol = headers.indexOf("quizStatus");
    
    if (topicIdCol === -1) return { success: false, message: "topicId column not found" };
    
    let updated = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === topicId) {
        if (quizStatusCol >= 0) {
          topicSheet.getRange(i + 1, quizStatusCol + 1).setValue(newStatus);
          updated = true;
        } else {
          // If quizStatus column doesn't exist, we must add it
          return { success: false, message: "quizStatus column is missing in Topics schema. Please run createAllSheets to update schema." };
        }
        break;
      }
    }
    
    if (updated) {
      clearTopicsCache();
      return { success: true, message: "Cập nhật trạng thái thành công" };
    } else {
      return { success: false, message: "Không tìm thấy Topic" };
    }
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Cập nhật điểm thưởng XP cho Topic (xpReward, quizXpReward, matchingXpReward)
 */
function adminUpdateTopicReward(topicId, rewardType, newReward) {
  try {
    if (rewardType !== 'xpReward' && rewardType !== 'quizXpReward' && rewardType !== 'matchingXpReward') {
      return { success: false, message: "Loại điểm thưởng không hợp lệ" };
    }
    const ss = getOrCreateDatabase();
    const topicSheet = ss.getSheetByName("Topics");
    if (!topicSheet) return { success: false, message: "Không tìm thấy sheet Topics" };
    
    let headers = topicSheet.getRange(1, 1, 1, topicSheet.getLastColumn()).getValues()[0];
    let colIndex = headers.indexOf(rewardType);
    
    // Nếu cột chưa có, tự động thêm vào cuối
    if (colIndex === -1) {
      colIndex = headers.length;
      topicSheet.getRange(1, colIndex + 1).setValue(rewardType);
      headers.push(rewardType);
    }
    
    const topicIdCol = headers.indexOf("topicId");
    if (topicIdCol === -1) return { success: false, message: "Cột topicId không tồn tại" };
    
    const data = topicSheet.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][topicIdCol]).trim() === String(topicId).trim()) {
        topicSheet.getRange(i + 1, colIndex + 1).setValue(Number(newReward) || 0);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      if (typeof clearTopicsCache === 'function') clearTopicsCache();
      return { success: true, message: "Cập nhật điểm thưởng thành công!" };
    } else {
      return { success: false, message: "Không tìm thấy Topic với ID: " + topicId };
    }
  } catch (error) {
    Logger.log("Error in adminUpdateTopicReward: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Generate Questions via AI for Admin
 */
function adminGenerateQuestionsByAI(topicId) {
  try {
    // 1. Get Topic Info
    const topicResult = getTopicById(topicId);
    if (!topicResult.success || !topicResult.topic) {
      return { success: false, message: "Topic not found" };
    }
    const topic = topicResult.topic;
    
    if (!topic.contentDocId) {
      return { success: false, message: "Topic chưa có nội dung (contentDocId). Vui lòng cấu hình tài liệu học tập trước." };
    }

    const userId = Session.getActiveUser().getEmail() || "admin";
    const userContext = { userId: userId, email: userId }; // Fallback to email as userId for admin tools
    
    // Lấy danh sách câu hỏi hiện có để truyền cho AI chống trùng lặp
    const existingQuestionsResult = adminGetQuestionsForTopic(topicId);
    let existingQuestionsText = "Không có câu hỏi cũ nào.";
    if (existingQuestionsResult.success && existingQuestionsResult.questions && existingQuestionsResult.questions.length > 0) {
      existingQuestionsText = existingQuestionsResult.questions
        .map((q, idx) => `${idx + 1}. ${q.questionText}`)
        .join("\n");
    }

    // 2. Read Google Doc
    const docResult = GeminiService.readGoogleDoc(topic.contentDocId);
    if (!docResult.success) {
      return { success: false, message: "Không thể đọc tài liệu: " + docResult.error };
    }
    
    // 3. Analyze Doc
    const analysis = ContentGenerator.analyzeDocument(
      docResult.content,
      userContext,
      { topicId: topicId }
    );
    
    // 4. Generate Questions
    const questionsResult = ContentGenerator.generateQuestions(
      docResult.content,
      analysis,
      { existingQuestionsText: existingQuestionsText },
      userContext,
      { topicId: topicId }
    );
    
    // Format the response for the admin UI
    if (questionsResult && questionsResult.questions) {
      // Map to the format we need in DB
      const formattedQuestions = questionsResult.questions.map((q, index) => ({
        questionId: "TEMP_" + Date.now() + "_" + index, // Dùng questionId để adminSaveQuestions nhận diện là câu mới
        topicId: topicId,
        questionText: q.question,
        optionA: q.options[0] || "",
        optionB: q.options[1] || "",
        optionC: q.options[2] || "",
        optionD: q.options[3] || "",
        correctAnswer: q.correctAnswer === 0 ? "A" : q.correctAnswer === 1 ? "B" : q.correctAnswer === 2 ? "C" : "D",
        explanation: q.explanation || "",
        difficulty: q.difficulty || "medium",
        status: "draft",
        source: "ai_generated",
        bloomLevel: q.bloomLevel || "understand"
      }));
      
      // Update topic status to ai_generated
      adminUpdateTopicQuizStatus(topicId, "ai_generated");
      
      // Tự động lưu các câu hỏi nháp này vào Database
      adminSaveQuestions(topicId, formattedQuestions);

      // Trả về danh sách câu hỏi mới nhất từ Database (bao gồm cả cũ và mới)
      const latestQuestionsResult = adminGetQuestionsForTopic(topicId);
      
      return {
        success: true,
        questions: latestQuestionsResult.success ? latestQuestionsResult.questions : formattedQuestions
      };
    } else {
      return { success: false, message: "AI trả về dữ liệu không hợp lệ" };
    }
  } catch (error) {
    Logger.log("Error in adminGenerateQuestionsByAI: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get all questions for a topic (for admin review)
 */
function adminGetQuestionsForTopic(topicId) {
  try {
    const ss = getOrCreateDatabase();
    const mcqSheet = ss.getSheetByName("MCQ_Questions");
    if (!mcqSheet) return { success: true, questions: [] };
    
    const data = mcqSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, questions: [] };
    
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    
    const targetId = String(topicId || "").trim();
    const isAll = (targetId === "" || targetId.toUpperCase() === "ALL");
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      const rowTopicId = String(data[i][topicIdCol]).trim();
      if (isAll || (rowTopicId === targetId && rowTopicId !== "")) {
        const q = {};
        headers.forEach((h, idx) => {
          let val = data[i][idx];
          if (val instanceof Date) {
            val = val.toISOString();
          }
          q[h] = val;
        });
        questions.push(q);
      }
    }
    
    return { success: true, questions: questions };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Save reviewed questions
 * @param {string} topicId
 * @param {Array} questions
 */
function adminSaveQuestions(topicId, questions) {
  try {
    const ss = getOrCreateDatabase();
    let mcqSheet = ss.getSheetByName("MCQ_Questions");
    if (!mcqSheet) return { success: false, message: "MCQ_Questions sheet not found" };
    
    const data = mcqSheet.getDataRange().getValues();
    const headers = data[0];
    
    const now = new Date();
    const adminEmail = Session.getActiveUser().getEmail() || "admin";
    
    // Track new questions vs updates
    const topicResult = getTopicById(topicId);
    const topicTitle = topicResult.success && topicResult.topic ? topicResult.topic.title : "";
    
    // Prepare column indices and auto-add missing columns
    let qIdCol = headers.indexOf("questionId");
    if (qIdCol === -1) return { success: false, message: "Lỗi nghiêm trọng: Thiếu cột 'questionId' gốc trong Sheet MCQ_Questions." };
    
    // Tự động thêm các cột bị thiếu vào cuối dòng tiêu đề (cho các CSDL cũ)
    const requiredColumns = ["status", "source"];
    let addedColumns = false;
    requiredColumns.forEach(col => {
      if (headers.indexOf(col) === -1) {
        headers.push(col);
        addedColumns = true;
      }
    });
    
    if (addedColumns) {
      // Ghi lại mảng headers mới vào dòng 1
      mcqSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      SpreadsheetApp.flush();
    }
    
    const existingIds = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][qIdCol]) {
        existingIds[String(data[i][qIdCol]).trim()] = i + 1; // row index (1-based)
      }
    }
    
    let approvedCount = 0;
    
    questions.forEach(q => {
      const qIdStr = q.questionId ? String(q.questionId).trim() : "";
      const isNew = !qIdStr || qIdStr.startsWith("TEMP_");
      const questionId = isNew ? generateId("MCQ") : qIdStr;
      
      const status = q.status || "approved";
      if (status === "approved") approvedCount++;
      
      // Build row data based on headers
      const rowData = headers.map(h => {
        if (h === "questionId") return questionId;
        if (h === "topicId") return topicId;
        if (h === "topicTitle") return topicTitle;
        if (h === "questionText") return q.questionText || "";
        if (h === "optionA") return q.optionA || "";
        if (h === "optionB") return q.optionB || "";
        if (h === "optionC") return q.optionC || "";
        if (h === "optionD") return q.optionD || "";
        if (h === "correctAnswer") return q.correctAnswer || "A";
        if (h === "explanation") return q.explanation || "";
        if (h === "difficulty") return q.difficulty || "medium";
        if (h === "status") return status;
        if (h === "source") return q.source || "manual";
        if (h === "createdBy") return isNew ? adminEmail : (q.createdBy || adminEmail);
        if (h === "reviewedBy") return adminEmail;
        if (h === "createdAt") return isNew ? now : (q.createdAt || now);
        if (h === "updatedAt") return now;
        if (h === "publishedAt") return status === "approved" ? (q.publishedAt || now) : "";
        
        // Use existing value if update, or empty for other unknown columns
        if (!isNew && q[h] !== undefined) return q[h];
        return "";
      });
      
      if (!isNew && existingIds[questionId]) {
        // Update existing row
        mcqSheet.getRange(existingIds[questionId], 1, 1, headers.length).setValues([rowData]);
      } else {
        // Append new row
        mcqSheet.appendRow(rowData);
      }
    });
    
    // Update Topic Status
    if (approvedCount > 0) {
      adminUpdateTopicQuizStatus(topicId, "ready");
    } else {
      adminUpdateTopicQuizStatus(topicId, "need_questions");
    }
    
    SpreadsheetApp.flush(); // Đảm bảo ghi dữ liệu thành công trước khi trả về
    
    return { success: true, message: "Lưu câu hỏi thành công", approvedCount: approvedCount };
  } catch (error) {
    Logger.log("Error in adminSaveQuestions: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Xóa danh sách câu hỏi khỏi Database
 * @param {Array} questionIds - Mảng các ID câu hỏi cần xóa
 */
function adminDeleteQuestions(questionIds) {
  try {
    if (!questionIds || questionIds.length === 0) return { success: true };
    
    // Đảm bảo tất cả ID từ client gửi lên đều là string để so sánh an toàn
    const strQuestionIds = questionIds.map(id => String(id).trim());
    
    const ss = getOrCreateDatabase();
    const mcqSheet = ss.getSheetByName("MCQ_Questions");
    if (!mcqSheet) return { success: false, message: "MCQ_Questions sheet not found" };
    
    const data = mcqSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true };
    
    const headers = data[0];
    const qIdCol = headers.indexOf("questionId");
    if (qIdCol === -1) return { success: false, message: "questionId column missing" };
    
    // Tìm index của các row cần xóa
    const rowsToDelete = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][qIdCol]) {
        const id = String(data[i][qIdCol]).trim();
        if (strQuestionIds.includes(id)) {
          rowsToDelete.push(i + 1); // 1-based index
        }
      }
    }
    
    // Xóa từ dưới lên trên để không làm sai lệch index
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowIndex => {
      mcqSheet.deleteRow(rowIndex);
    });

    const deletedCount = rowsToDelete.length;
    if (deletedCount === 0) {
      return { success: false, message: "Không tìm thấy câu hỏi để xóa", deletedCount: 0 };
    }

    return { success: true, message: `Đã xóa ${deletedCount} câu hỏi`, deletedCount: deletedCount };
  } catch (error) {
    Logger.log("Error in adminDeleteQuestions: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Lấy danh sách câu hỏi ĐÃ DUYỆT cho user chơi quiz
 * @param {string} topicId
 */
function getApprovedQuestionsForTopic(topicId) {
  try {
    const ss = getOrCreateDatabase();
    const mcqSheet = ss.getSheetByName("MCQ_Questions");
    if (!mcqSheet) return { success: false, message: "Chưa có dữ liệu câu hỏi" };
    
    const data = mcqSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, questions: [] };
    
    const headers = data[0];
    const topicIdCol = headers.indexOf("topicId");
    const statusCol = headers.indexOf("status");
    
    if (topicIdCol === -1 || statusCol === -1) return { success: false, message: "Lỗi cấu trúc CSDL" };
    
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][topicIdCol] === topicId && data[i][statusCol] === "approved") {
        const q = {};
        headers.forEach((h, idx) => {
          let val = data[i][idx];
          if (val instanceof Date) {
            val = val.toISOString();
          }
          q[h] = val;
        });
        
        // Format options array to match frontend expectation
        const options = [q.optionA || "", q.optionB || "", q.optionC || "", q.optionD || ""];
        
        // Convert correctAnswer letter to index
        let correctIndex = 0;
        if (q.correctAnswer === "A") correctIndex = 0;
        else if (q.correctAnswer === "B") correctIndex = 1;
        else if (q.correctAnswer === "C") correctIndex = 2;
        else if (q.correctAnswer === "D") correctIndex = 3;
        
        questions.push({
          id: q.questionId,
          question: q.questionText,
          options: options,
          correctAnswer: correctIndex,
          explanation: q.explanation || "",
          difficulty: q.difficulty || "medium",
          bloomLevel: q.bloomLevel || "understand"
        });
      }
    }
    
    // Phân loại câu hỏi theo độ khó
    const easyQuestions = [];
    const mediumQuestions = [];
    const hardQuestions = [];
    
    questions.forEach(q => {
      const diff = (q.difficulty || "medium").toLowerCase();
      if (diff === "easy") easyQuestions.push(q);
      else if (diff === "hard") hardQuestions.push(q);
      else mediumQuestions.push(q);
    });
    
    // Shuffle từng nhóm
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    shuffleArray(easyQuestions);
    shuffleArray(mediumQuestions);
    shuffleArray(hardQuestions);
    
    // Lấy số lượng theo tỷ lệ yêu cầu: 14 Easy, 4 Medium, 2 Hard (tổng 20)
    let finalQuestions = [];
    
    const takeQuestions = (sourceArray, count) => {
      const taken = sourceArray.splice(0, count);
      finalQuestions = finalQuestions.concat(taken);
      return count - taken.length; // Trả về số lượng còn thiếu
    };
    
    let missingEasy = takeQuestions(easyQuestions, 14);
    let missingMedium = takeQuestions(mediumQuestions, 4);
    let missingHard = takeQuestions(hardQuestions, 2);
    
    // Tổng số lượng còn thiếu
    let totalMissing = missingEasy + missingMedium + missingHard;
    
    // Nếu thiếu, bù đắp từ các nhóm còn dư theo thứ tự: Medium -> Easy -> Hard
    if (totalMissing > 0) {
      if (mediumQuestions.length > 0) totalMissing = takeQuestions(mediumQuestions, totalMissing);
      if (totalMissing > 0 && easyQuestions.length > 0) totalMissing = takeQuestions(easyQuestions, totalMissing);
      if (totalMissing > 0 && hardQuestions.length > 0) totalMissing = takeQuestions(hardQuestions, totalMissing);
    }
    
    // Shuffle lần cuối toàn bộ 20 câu
    shuffleArray(finalQuestions);
    
    // Cache the original full list inside 'data' so client can use it if needed? 
    // No, client specifically wants to load faster by getting a smaller payload.
    // If they retry, they get a NEW set of 20 random questions, which is actually better for practice!
    
    return { 
      success: true, 
      data: JSON.stringify({ questions: finalQuestions }) 
    };
  } catch (error) {
    Logger.log("Error in getApprovedQuestionsForTopic: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Lấy HTML cho trang Quản lý câu hỏi (gọi từ frontend)
 */
function getQuestionManagerHtml() {
  try {
    const styles = HtmlService.createHtmlOutputFromFile('views/admin/questionManager/question_manager_styles').getContent();
    const content = HtmlService.createHtmlOutputFromFile('views/admin/questionManager/question_manager_content').getContent();
    const scripts = HtmlService.createHtmlOutputFromFile('views/admin/questionManager/question_manager_scripts').getContent();

    return styles + content + scripts;
  } catch (error) {
    Logger.log("Error loading Question Manager: " + error.toString());
    return `<div style="padding:40px;text-align:center;color:#d93025;">
      <h3>Lỗi tải trang Quản lý Câu hỏi</h3>
      <p>${error.toString()}</p>
    </div>`;
  }
}
