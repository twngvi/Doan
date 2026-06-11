/**
 * adminStats.js - Server-side code for calculating Admin Dashboard Statistics
 */

function getAdminDashboardChartsData() {
  try {
    const spreadsheet = getOrCreateDatabase();
    
    // 1. Load Data
    const usersSheet = spreadsheet.getSheetByName("Users");
    if (!usersSheet) throw new Error("Không tìm thấy bảng Users");
    const usersData = usersSheet.getDataRange().getValues();
    
    const progressSheet = spreadsheet.getSheetByName("User_Progress");
    const progressData = progressSheet && progressSheet.getLastRow() > 0 ? progressSheet.getDataRange().getValues() : [];
    
    const answerSheet = spreadsheet.getSheetByName("Answer_History");
    const answerData = answerSheet && answerSheet.getLastRow() > 0 ? answerSheet.getDataRange().getValues() : [];
    
    const topicsSheet = spreadsheet.getSheetByName("Topics");
    const topicsData = topicsSheet && topicsSheet.getLastRow() > 0 ? topicsSheet.getDataRange().getValues() : [];

    // Utility functions
    const toNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
    const toBool = (value) => {
      const text = String(value).trim().toLowerCase();
      return value === true || value === 1 || text === "true" || text === "1" || text === "yes";
    };

    const now = new Date();
    const nowTime = now.getTime();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * DAY_MS;
    const THIRTY_DAYS_MS = 30 * DAY_MS;

    // Build Topic Name Map
    const topicNames = {};
    if (topicsData.length > 1) {
      const tCol = { id: topicsData[0].indexOf("topicId"), title: topicsData[0].indexOf("title") };
      for (let i = 1; i < topicsData.length; i++) {
        if (tCol.id !== -1 && tCol.title !== -1) {
          topicNames[String(topicsData[i][tCol.id])] = String(topicsData[i][tCol.title]);
        }
      }
    }
    const getTopicName = (id) => topicNames[id] || `Topic ${id}`;

    // ==========================================
    // NHÓM 1: TỔNG QUAN NGƯỜI HỌC & LEVEL
    // ==========================================
    let totalLearners = 0;
    let activeToday = 0;
    let active7Days = 0;
    let disabledLearners = 0;
    
    let newLearners = 0;
    let returningLearners = 0;
    let churnLearners = 0;
    
    const levelCounts = {};

    if (usersData.length > 1) {
      const h = usersData[0].map(x => String(x || "").trim());
      const col = {
        role: h.indexOf("role"), level: h.indexOf("level"), isActive: h.indexOf("isActive"),
        lastSeenAt: h.indexOf("lastSeenAt"), lastActiveDate: h.indexOf("lastActiveDate"), lastLogin: h.indexOf("lastLogin"),
        createdAt: h.indexOf("createdAt")
      };

      const getDateFromRow = (row, c1, c2, c3) => {
        const candidates = [c1, c2, c3].filter(idx => idx !== -1 && idx !== undefined).map(idx => row[idx]);
        for (const value of candidates) {
          if (!value) continue;
          const date = value instanceof Date ? value : new Date(value);
          if (!isNaN(date.getTime())) return date;
        }
        return null;
      };

      for (let i = 1; i < usersData.length; i++) {
        const row = usersData[i];
        if (String(row[col.role] || "").trim().toUpperCase() === "ADMIN") continue;
        
        totalLearners++;
        if (!toBool(row[col.isActive])) {
          disabledLearners++;
          continue;
        }

        const lastActive = getDateFromRow(row, col.lastSeenAt, col.lastActiveDate, col.lastLogin);
        const createdDate = getDateFromRow(row, col.createdAt);
        
        let diffDaysActive = 999;
        if (lastActive) {
          diffDaysActive = (nowTime - lastActive.getTime()) / DAY_MS;
          if (diffDaysActive <= 1) activeToday++;
          if (diffDaysActive <= 7) active7Days++;
          if (diffDaysActive > 30) churnLearners++;
        }

        if (createdDate && (nowTime - createdDate.getTime() <= SEVEN_DAYS_MS)) {
          newLearners++;
        }

        // Cấp độ
        const level = Math.max(1, parseInt(row[col.level], 10) || 1);
        levelCounts[`Level ${level}`] = (levelCounts[`Level ${level}`] || 0) + 1;
      }
    }

    // Sort level distribution
    const levelLabels = Object.keys(levelCounts).sort((a, b) => Number(a.replace("Level ", "")) - Number(b.replace("Level ", "")));
    const levelData = levelLabels.map(lbl => levelCounts[lbl]);

    // ==========================================
    // NHÓM 2 & 3: TIẾN ĐỘ & KẾT QUẢ HỌC TẬP (User_Progress)
    // ==========================================
    let totalEnrolledTopics = 0;
    let completedTopics = 0;
    
    let sumQuizAccuracy = 0;
    let countQuizAccuracy = 0;
    let passedQuiz = 0;
    
    const topicStats = {}; // { topicId: { enrolls: 0, sumAcc: 0, countAcc: 0 } }

    if (progressData.length > 1) {
      const h = progressData[0].map(x => String(x || "").trim());
      const col = {
        topicId: h.indexOf("topicId"), topicStatus: h.indexOf("topicStatus"),
        quizCompleted: h.indexOf("quizCompleted"), quizAccuracy: h.indexOf("quizAccuracy")
      };

      for (let i = 1; i < progressData.length; i++) {
        const row = progressData[i];
        const tid = String(row[col.topicId]);
        if (!tid) continue;
        
        totalEnrolledTopics++;
        if (!topicStats[tid]) topicStats[tid] = { enrolls: 0, sumAcc: 0, countAcc: 0 };
        topicStats[tid].enrolls++;

        if (String(row[col.topicStatus]).toLowerCase() === "completed" || toBool(row[col.quizCompleted])) {
          completedTopics++;
        }

        const accuracy = toNumber(row[col.quizAccuracy]);
        if (accuracy > 0) {
          sumQuizAccuracy += accuracy;
          countQuizAccuracy++;
          topicStats[tid].sumAcc += accuracy;
          topicStats[tid].countAcc++;
          
          if (accuracy >= 60) passedQuiz++; // pass >= 60%
        }
      }
    }

    const completionRate = totalEnrolledTopics > 0 ? ((completedTopics / totalEnrolledTopics) * 100).toFixed(1) : 0;
    const avgAccuracy = countQuizAccuracy > 0 ? (sumQuizAccuracy / countQuizAccuracy).toFixed(1) : 0;
    const passRate = countQuizAccuracy > 0 ? ((passedQuiz / countQuizAccuracy) * 100).toFixed(1) : 0;

    // Top 5 trending topics (theo số lượng enroll)
    const sortedTrending = Object.keys(topicStats)
      .map(tid => ({ label: getTopicName(tid), value: topicStats[tid].enrolls }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top 5 hardest topics (lowest accuracy)
    const sortedHardest = Object.keys(topicStats)
      .filter(tid => topicStats[tid].countAcc > 0)
      .map(tid => ({
        label: getTopicName(tid),
        value: Number((topicStats[tid].sumAcc / topicStats[tid].countAcc).toFixed(1))
      }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 5);

    // ==========================================
    // NHÓM 4: HOẠT ĐỘNG THEO NGÀY (Answer_History)
    // ==========================================
    const dailyActivity = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowTime - i * DAY_MS);
      dailyActivity[`${d.getDate()}/${d.getMonth() + 1}`] = 0;
    }

    if (answerData.length > 1) {
      const h = answerData[0].map(x => String(x || "").trim());
      const dateCol = h.indexOf("answeredAt");
      
      if (dateCol !== -1) {
        for (let i = 1; i < answerData.length; i++) {
          const val = answerData[i][dateCol];
          if (!val) continue;
          const ansDate = val instanceof Date ? val : new Date(val);
          if (isNaN(ansDate.getTime())) continue;
          
          if (nowTime - ansDate.getTime() <= SEVEN_DAYS_MS) {
            const dateStr = `${ansDate.getDate()}/${ansDate.getMonth() + 1}`;
            if (dailyActivity[dateStr] !== undefined) {
              dailyActivity[dateStr]++;
            }
          }
        }
      }
    }

    return {
      success: true,
      data: {
        // Nhóm 1: Tổng quan
        overview: {
          totalLearners,
          activeToday,
          active7Days,
          disabledLearners
        },
        // Nhóm 2: Tiến độ học
        progress: {
          levelDistribution: {
            labels: levelLabels.length > 0 ? levelLabels : ["Level 1"],
            data: levelData.length > 0 ? levelData : [0]
          },
          topicsCompleted: completedTopics,
          completionRate: completionRate,
          topTrending: {
            labels: sortedTrending.map(t => t.label),
            data: sortedTrending.map(t => t.value)
          }
        },
        // Nhóm 3: Kết quả học tập
        results: {
          avgAccuracy,
          passRate,
          hardestTopics: {
            labels: sortedHardest.map(t => t.label),
            data: sortedHardest.map(t => t.value)
          }
        },
        // Nhóm 4: Hoạt động gần đây
        recentActivity: {
          newLearners,
          returningLearners: Math.max(0, active7Days - activeToday - newLearners), // Xấp xỉ
          churnLearners,
          dailyTimeline: {
            labels: Object.keys(dailyActivity),
            data: Object.values(dailyActivity)
          }
        }
      }
    };

  } catch (error) {
    Logger.log("Error in getAdminDashboardChartsData: " + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}
