/**
 * Mock Data Generator for Testing
 */
function runGenerate10TestAccounts() {
  try {
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      Logger.log("Users sheet not found!");
      return "Users sheet not found";
    }

    // English Names
    const firstNames = ["James", "Emily", "Michael", "Sarah", "William", "Jessica", "David", "Ashley", "John", "Amanda", "Robert", "Jennifer", "Joseph", "Melissa", "Thomas", "Nicole", "Charles", "Stephanie", "Daniel", "Elizabeth"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

    const now = new Date(); // ~July 13, 2026
    const startDate = new Date(2026, 5, 1); // June 1st, 2026

    Logger.log("Bắt đầu tạo 15 tài khoản clone...");

    for (let i = 1; i <= 15; i++) {
      // 1. Generate Info
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      const displayName = `${firstName} ${lastName}`;
      const email = `clone${i}@test.com`;
      const username = `clone${i}`;
      const password = "password123";
      
      const avatarUrl = typeof getRandomAvatar === 'function' ? getRandomAvatar() : `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`;
      
      const userId = generateNextId(usersSheet, "USR");
      const passwordHashVal = hashPassword(password);
      
      // Hoạt động cá nhân: Quyết định độ chăm chỉ (để dữ liệu không đồng đều)
      // High (1), Medium (2), Low (3). User 14 và 15 giống nhau (cùng profile)
      let activityProfile = Math.floor(Math.random() * 3);
      let preferredHour = Math.floor(Math.random() * 14) + 8; // 8:00 to 21:00
      
      if (i === 15) {
        // Cố tình làm giống bạn số 14
        activityProfile = 1; 
        preferredHour = 19; 
      } else if (i === 14) {
        activityProfile = 1;
        preferredHour = 19;
      }

      const totalDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      
      // Xây dựng fake history cơ bản dựa trên profile
      let activeDaysCount = 0;
      let totalTimeSpent = 0;
      let totalXP = 500;
      let totalXQP = 100;
      let totalQuiz = 0;
      let totalPuzzle = 0;
      let totalChallenge = 0;
      
      if (activityProfile === 0) activeDaysCount = Math.floor(totalDays * 0.8); // 80% active
      else if (activityProfile === 1) activeDaysCount = Math.floor(totalDays * 0.5); // 50% active
      else activeDaysCount = Math.floor(totalDays * 0.2); // 20% active

      totalXP += activeDaysCount * (Math.floor(Math.random() * 200) + 50);
      totalXQP += activeDaysCount * (Math.floor(Math.random() * 50) + 10);
      const streak = Math.floor(activeDaysCount / 3);
      const level = Math.floor(totalXP / 1000) + 1;
      
      const createdDate = new Date(startDate.getTime()); // Học từ 1/6
      
      const newUserRow = [
        userId, // 0
        "", // 1 googleId
        email, // 2
        displayName, // 3
        username, // 4
        passwordHashVal, // 5
        avatarUrl, // 6
        "STUDENT", // 7
        level, // 8
        1, // 9 aiLevel
        0, // 10
        totalXP, // 11
        totalXQP, // 12
        streak, // 13
        streak + 2, // 14 longest
        now, // 15 lastActiveDate
        now, // 16 lastLogin
        createdDate, // 17 createdAt
        true, // 18 isActive
        Math.floor(Math.random() * 10), // 19
        Math.floor(Math.random() * 5) + 1, // 20
        0, // 21
        Math.floor(activeDaysCount * 2), // 22 quiz
        Math.floor(activeDaysCount * 1.5), // 23 puzzle
        Math.floor(activeDaysCount * 0.5), // 24 challenge
        "", // 25 progressSheetId (to be filled)
        true, // 26 emailVerified
        "", // 27 token
        "", // 28 expires
        typeof generatePlayerId === 'function' ? generatePlayerId(usersSheet) : `ID${Math.floor(Math.random()*9000)+1000}` // 29
      ];
      
      usersSheet.appendRow(newUserRow);
      const rowIdx = usersSheet.getLastRow();
      
      Logger.log(`Đã tạo cơ bản user ${i}: ${email}`);
      
      // 2. Tạo Personal Sheet
      let progressSheetId = "";
      try {
        progressSheetId = createUserPersonalSheet(userId, username);
        usersSheet.getRange(rowIdx, 26).setValue(progressSheetId);
      } catch (err) {
        Logger.log(`Lỗi khi tạo Personal Sheet cho ${email}: ${err.toString()}`);
      }
      
      // 3. Inject Mock Learning Data từ 1/6
      if (progressSheetId) {
        injectMockLearningData(userId, email, progressSheetId, startDate, now, activeDaysCount, preferredHour);
      }
      
      // Tránh time out cho script GAS
      Utilities.sleep(1000);
    }

    Logger.log("Hoàn tất tạo 15 tài khoản clone!");
    return "Thành công!";
  } catch (error) {
    Logger.log("Lỗi: " + error.toString());
    return error.toString();
  }
}

function injectMockLearningData(userId, email, sheetId, startDate, endDate, activeDaysCount, preferredHour) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    
    let sessionSheet = ss.getSheetByName("AI_Learning_Sessions");
    if (!sessionSheet) {
      if (typeof ensureAILearningSheetsExist === 'function') {
        ensureAILearningSheetsExist(userId);
      } else {
        sessionSheet = ss.insertSheet("AI_Learning_Sessions");
        sessionSheet.appendRow([
          "sessionId", "topicId", "startedAt", "completedAt", "lessonViewed", "mindmapViewed", "infographicViewed", "flashcardsTotal", "flashcardsReviewed", "quizAttempted", "quizScore", "quizAccuracy", "totalTimeSpent", "scrollDepth", "interactionCount", "wrongAnswersCount", "newConceptsLearned", "feedbackScore", "feedbackText"
        ]);
      }
      sessionSheet = ss.getSheetByName("AI_Learning_Sessions");
    }
    
    // Tạo danh sách các ngày hoạt động (random từ startDate đến endDate)
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    let activeDays = new Set();
    while(activeDays.size < activeDaysCount) {
       activeDays.add(Math.floor(Math.random() * totalDays));
    }
    
    const activeDaysArray = Array.from(activeDays).sort((a,b) => a-b);
    
    // Inject Sessions & Logins
    for (let i = 0; i < activeDaysArray.length; i++) {
      const dayOffset = activeDaysArray[i];
      // Random giờ quanh preferredHour (+- 2 hours)
      const actualHour = Math.max(0, Math.min(23, preferredHour + (Math.floor(Math.random() * 5) - 2)));
      const minute = Math.floor(Math.random() * 60);
      
      const sessionDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayOffset, actualHour, minute, 0);
      
      // Mock logins
      if (typeof saveLoginToPersonalSheet === 'function') {
         saveLoginToPersonalSheet(sheetId, email, sessionDate);
      }
      
      if (sessionSheet) {
        // Trong ngày có thể có 1-4 session học / chơi
        const dailySessions = Math.floor(Math.random() * 4) + 1;
        
        let currentSessionTime = new Date(sessionDate.getTime());
        
        for (let j = 0; j < dailySessions; j++) {
          const durationMins = Math.floor(Math.random() * 25) + 5; // 5-30 mins
          const completedAt = new Date(currentSessionTime.getTime() + durationMins * 60000);
          
          const sessionId = "ALS_MOCK_" + Math.random().toString(36).substring(2, 8);
          
          sessionSheet.appendRow([
            sessionId, // sessionId
            "TOPIC_MOCK_" + Math.floor(Math.random()*15), // topicId
            currentSessionTime, // startedAt
            completedAt, // completedAt
            Math.random() > 0.3 ? 1 : 0, // lessonViewed
            Math.random() > 0.5 ? 1 : 0, // mindmapViewed
            Math.random() > 0.5 ? 1 : 0, // infographicViewed
            Math.floor(Math.random()*15)+5, // total flashcards
            Math.floor(Math.random()*10)+5, // reviewed
            1, // quizAttempted
            Math.floor(Math.random()*60)+40, // quizScore (40-100)
            Math.floor(Math.random()*60)+40, // quizAccuracy
            durationMins, // totalTimeSpent
            Math.floor(Math.random()*40)+60, // scrollDepth
            Math.floor(Math.random()*30)+10, // interactionCount
            Math.floor(Math.random()*5), // wrongAnswers
            Math.floor(Math.random()*3)+1, // newConcepts
            Math.floor(Math.random()*3)+3, // feedbackScore
            "Mock feedback"
          ]);
          
          // Next session later that day
          currentSessionTime = new Date(completedAt.getTime() + (Math.floor(Math.random() * 60) + 10) * 60000); 
        }
      }
    }
  } catch (err) {
    Logger.log(`Lỗi inject data: ${err.toString()}`);
  }
}
