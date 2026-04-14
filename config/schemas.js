/**
 * schemas.js - Database Schema Definitions
 *
 * Chứa cấu trúc schema cho MASTER_DB và USER_DB
 * Updated: Phase 1 - AI Learning System Integration
 */

// ========== AI LEARNING SYSTEM CONSTANTS ==========

const AI_CONFIG = {
  // Gemini API Settings
  GEMINI_USER_KEY_PREFIX: "GEMINI_USER_KEY_",
  GEMINI_KEY_ENCRYPTION_SECRET_PROPERTY: "GEMINI_KEY_ENCRYPTION_SECRET",
  GEMINI_MODEL_DEFAULT: "gemini-2.5-flash-lite",
  GEMINI_MODEL_ADVANCED: "gemini-2.5-flash-lite",

  // Cache Settings
  CACHE_TTL_DAYS: 30, // Cache content trong 30 ngày
  AUTO_REGENERATE_ON_DOC_CHANGE: true, // Tự động regenerate khi doc thay đổi

  // Question Variants
  MAX_VARIANTS_PER_QUESTION: 5, // Tối đa 5 variants mỗi câu
  VARIANT_TYPES: [
    "original", // Câu gốc
    "rephrased", // Diễn đạt khác
    "scenario", // Đặt vào tình huống
    "inverse", // Hỏi ngược
    "application", // Áp dụng thực tế
  ],

  // Spaced Repetition Schedule (Intensive Mode)
  // reviewStage: 0=1h, 1=1d, 2=3d, 3=7d, 4=14d
  SPACED_REPETITION_HOURS: [1, 24, 72, 168, 336], // Giờ
  SPACED_REPETITION_LABELS: ["1 giờ", "1 ngày", "3 ngày", "7 ngày", "14 ngày"],

  // Question Mix Strategy (tổng = 100%)
  QUIZ_MIX: {
    WRONG_CONCEPTS: 40, // 40% câu từ wrong answer memory (variants)
    NEW_QUESTIONS: 30, // 30% câu mới chưa từng làm
    REINFORCEMENT: 20, // 20% câu đã đúng (củng cố)
    CHALLENGE: 10, // 10% câu khó hơn level
  },

  // Difficulty Settings
  DIFFICULTY_LEVELS: ["easy", "medium", "hard"],
  BLOOM_LEVELS: ["remember", "understand", "apply", "analyze"],

  // Content Types
  CONTENT_TYPES: [
    "mindmap",
    "infographic",
    "flashcards",
    "lesson_summary",
    "questions",
    "matching",
  ],

  // Rate Limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_TOKENS_PER_REQUEST: 4096,
};

// Helper: Tính nextReviewDate dựa trên reviewStage
function calculateNextReviewDate(reviewStage) {
  const now = new Date();
  const hoursToAdd =
    AI_CONFIG.SPACED_REPETITION_HOURS[reviewStage] ||
    AI_CONFIG.SPACED_REPETITION_HOURS[4];
  return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
}

// Helper: Tính priority từ wrongCount và lastAttempt
function calculateWrongAnswerPriority(wrongCount, lastAttempt) {
  const daysSinceLastAttempt =
    (new Date() - new Date(lastAttempt)) / (1000 * 60 * 60 * 24);
  // Priority cao nếu sai nhiều lần VÀ lâu chưa ôn
  const priority = Math.min(
    5,
    Math.ceil(wrongCount * 1.5 + daysSinceLastAttempt / 3),
  );
  return priority;
}

// Helper: Check nếu cache đã hết hạn
function isCacheExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

// Helper: Check nếu cần regenerate do doc thay đổi
function shouldRegenerateContent(docLastModified, cacheDocLastModified) {
  if (!AI_CONFIG.AUTO_REGENERATE_ON_DOC_CHANGE) return false;
  return new Date(docLastModified) > new Date(cacheDocLastModified);
}

// Helper: Generate cache expiry date
function generateCacheExpiryDate() {
  const now = new Date();
  return new Date(
    now.getTime() + AI_CONFIG.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
}

const DB_CONFIG = {
  SPREADSHEET_ID: "1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds", // Hard-coded ID for MASTER_DB
  SPREADSHEET_NAME: "MASTER_DB",
  USER_SHEETS_FOLDER_ID: "1dlc7DeSDw19J9_38E8cJvV5hNeopO3oS",
  SHEETS: {
    USERS: {
      name: "Users",
      idPrefix: "USR",
      columns: [
        "userId",
        "googleId",
        "email",
        "displayName",
        "username",
        "passwordHash",
        "avatarUrl",
        "role",
        "level",
        "aiLevel",
        "totalPoints",
        "totalXP",
        "totalXQP",
        "currentStreak",
        "longestStreak",
        "lastActiveDate",
        "lastLogin",
        "createdAt",
        "isActive",
        "mountainPosition",
        "mountainStage",
        "mountainProgress",
        "totalQuizAnswered",
        "totalPuzzleSolved",
        "totalChallengeCompleted",
        "progressSheetId",
        "emailVerified",
        "verificationToken",
        "verificationExpires",
      ],
    },

    TOPICS: {
      name: "Topics",
      idPrefix: "TOP",
      columns: [
        "topicId",
        "title",
        "description",
        "category",
        "order",
        "iconUrl",
        "estimatedTime",
        "prerequisiteTopics",
        "isLocked",
        "unlockCondition",
        "createdBy",
        "createdAt",
        "updatedAt",
        "contentDocId", // ⭐ THÊM CỘT MỚI
        "contentDocUrl",
      ],
    },

    MCQ_QUESTIONS: {
      name: "MCQ_Questions",
      idPrefix: "MCQ",
      columns: [
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
        "relatedTopics",
        "imageUrl",
        "timeLimit",
        "aiPromptTemplate",
      ],
    },

    CODE_PUZZLES: {
      name: "Code_Puzzles",
      idPrefix: "PUZ",
      columns: [
        "puzzleId",
        "topicId",
        "puzzleType",
        "title",
        "description",
        "codeBlocks",
        "correctOrder",
        "correctAnswer",
        "buggyLine",
        "fixedCode",
        "explanation",
        "difficulty",
        "hints",
        "points",
      ],
    },

    CHALLENGES: {
      name: "Challenges",
      idPrefix: "CHL",
      columns: [
        "challengeId",
        "topicId",
        "title",
        "description",
        "difficulty",
        "unlockCondition",
        "questionList",
        "timeLimit",
        "passingScore",
        "maxAttempts",
        "rewards",
        "story",
      ],
    },

    USER_PROGRESS: {
      name: "User_Progress",
      idPrefix: "PRG",
      columns: [
        "progressId",
        "userId",
        "topicId",
        "quizCompleted",
        "quizCorrect",
        "quizAccuracy",
        "puzzleCompleted",
        "puzzleCorrect",
        "challengeAttempts",
        "challengePassed",
        "topicStatus",
        "currentDifficulty",
        "estimatedLevel",
        "weakPoints",
        "lastQuestionId",
        "lastActivityDate",
        "startedAt",
        "completedAt",
      ],
    },

    ANSWER_HISTORY: {
      name: "Answer_History",
      idPrefix: "ANS",
      columns: [
        "historyId",
        "userId",
        "questionId",
        "questionType",
        "topicId",
        "userAnswer",
        "correctAnswer",
        "isCorrect",
        "timeTaken",
        "pointsEarned",
        "hintUsed",
        "attemptNumber",
        "difficulty",
        "answeredAt",
        "aiExplanation",
        "sessionId",
      ],
    },

    USER_NOTEBOOKS: {
      name: "User_Notebooks",
      idPrefix: "NOTE",
      columns: [
        "noteId",
        "userId",
        "topicId",
        "questionId",
        "title",
        "content",
        "tags",
        "isImportant",
        "createdAt",
        "updatedAt",
        "viewCount",
        "lastViewedAt",
      ],
    },

    ACHIEVEMENTS: {
      name: "Achievements",
      idPrefix: "ACH",
      columns: [
        "achievementId",
        "title",
        "description",
        "iconUrl",
        "category",
        "condition",
        "points",
        "rarity",
      ],
    },

    USER_ACHIEVEMENTS: {
      name: "User_Achievements",
      idPrefix: "UACH",
      columns: [
        "userAchievementId",
        "userId",
        "achievementId",
        "unlockedAt",
        "isViewed",
        "viewedAt",
      ],
    },

    LEADERBOARD: {
      name: "Leaderboard",
      idPrefix: "LDB",
      columns: [
        "rank",
        "userId",
        "displayName",
        "avatarUrl",
        "totalPoints",
        "mountainPosition",
        "level",
        "lastUpdated",
      ],
    },

    AI_EVALUATIONS: {
      name: "AI_Evaluations",
      idPrefix: "EVAL",
      columns: [
        "evaluationId",
        "userId",
        "topicId",
        "evaluationType",
        "accuracyScore",
        "speedScore",
        "consistencyScore",
        "overallScore",
        "estimatedLevel",
        "strengths",
        "weaknesses",
        "recommendations",
        "aiResponse",
      ],
    },

    CHAT_HISTORY: {
      name: "Chat_History",
      idPrefix: "CHAT",
      columns: [
        "chatId",
        "userId",
        "userMessage",
        "aiResponse",
        "context",
        "sentimentScore",
        "isHelpful",
        "createdAt",
      ],
    },

    SYSTEM_LOGS: {
      name: "System_Logs",
      idPrefix: "LOG",
      columns: [
        "logId",
        "timestamp",
        "level",
        "category",
        "userId",
        "action",
        "details",
        "ipAddress",
        "sessionId",
        "errorMessage",
      ],
    },

    ERROR_LOGS: {
      name: "Error_Logs",
      idPrefix: "ERR",
      columns: ["timestamp", "step", "error", "userId", "duration", "stack"],
    },

    // ========== AI LEARNING SYSTEM TABLES ==========

    AI_CONTENT_CACHE: {
      name: "AI_Content_Cache",
      idPrefix: "AIC",
      columns: [
        "cacheId", // AIC001, AIC002...
        "topicId", // Liên kết với Topics
        "contentDocId", // Google Doc ID nguồn
        "contentType", // mindmap|infographic|flashcards|lesson_summary|questions
        "generatedContent", // JSON output từ Gemini
        "promptUsed", // Prompt template đã dùng
        "geminiModel", // gemini-1.5-pro | gemini-1.5-flash
        "tokensUsed", // Chi phí tokens
        "generationTime", // Thời gian generate (ms)
        "qualityScore", // 1-5 (user feedback)
        "version", // v1, v2... (cho A/B testing)
        "docLastModified", // Timestamp doc lần cuối sửa (để auto-regenerate)
        "isActive", // true/false
        "createdAt",
        "expiresAt", // Cache TTL (30 ngày)
      ],
    },

    AI_QUESTION_POOL: {
      name: "AI_Question_Pool",
      idPrefix: "AIQ",
      columns: [
        "questionId", // AIQ001, AIQ002...
        "topicId",
        "baseConceptId", // ID khái niệm gốc (để group variants)
        "questionText",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
        "correctAnswer", // A|B|C|D
        "explanation", // Giải thích chi tiết
        "difficulty", // easy|medium|hard
        "bloomLevel", // remember|understand|apply|analyze
        "variantType", // original|rephrased|scenario|inverse|application
        "parentQuestionId", // NULL nếu là original, AIQ_ID nếu là variant
        "variantNumber", // 0 nếu original, 1-5 nếu variant
        "timesUsed", // Số lần đã xuất hiện
        "avgCorrectRate", // Tỷ lệ trả lời đúng trung bình
        "createdBy", // AI|Admin
        "isActive",
        "createdAt",
      ],
    },

    AI_GENERATION_LOGS: {
      name: "AI_Generation_Logs",
      idPrefix: "AGL",
      columns: [
        "logId",
        "userId", // Người trigger
        "topicId",
        "requestType", // full_analysis|questions_only|flashcards|mindmap|variants
        "inputDocId", // Google Doc ID
        "inputDocLength", // Số ký tự trong Google Doc
        "outputItemsCount", // Số items đã tạo
        "status", // pending|success|failed|partial
        "errorMessage",
        "tokensConsumed",
        "costEstimate", // Chi phí ước tính USD
        "processingTime", // milliseconds
        "geminiModel",
        "promptVersion", // Version của prompt template
        "createdAt",
      ],
    },

    AI_USER_KEYS: {
      name: "AI_User_Keys",
      idPrefix: "AUK",
      columns: [
        "keyId",
        "userId",
        "keyAlias",
        "keyHash",
        "encryptedKey",
        "isValid",
        "status",
        "lastValidatedAt",
        "lastUsedAt",
        "lastError",
        "createdAt",
        "updatedAt",
      ],
    },

    AI_KEY_USAGE_LOGS: {
      name: "AI_Key_Usage_Logs",
      idPrefix: "AKL",
      columns: [
        "usageId",
        "userId",
        "topicId",
        "contentType",
        "model",
        "status",
        "httpCode",
        "errorMessage",
        "durationMs",
        "createdAt",
      ],
    },
  },
};

const USER_DB_CONFIG = {
  SHEET_NAME_PREFIX: "USER_DB_",
  SHEETS: {
    PROFILE: {
      name: "Profile",
      columns: [
        "userId",
        "username",
        "level",
        "totalXP",
        "totalXQP",
        "aiLevel",
        "mountainStage",
        "currentStreak",
        "bestStreak",
        "totalTimeSpent",
        "joinedAt",
        "lastActive",
      ],
    },
    TOPIC_PROGRESS: {
      name: "Topic_Progress",
      idPrefix: "PRG",
      columns: [
        "progressId",
        "topicId",
        "topicTitle",
        "quizDone",
        "matchingDone",
        "challengeDone",
        "attempts",
        "accuracy",
        "bestScore",
        "xpEarned",
        "aiScore",
        "aiDecision",
        "status",
        "unlockedAt",
        "completedAt",
      ],
    },
    GAME_HISTORY: {
      name: "Game_History",
      idPrefix: "HST",
      columns: [
        "historyId",
        "topicId",
        "gameType",
        "questionId",
        "userAnswer",
        "isCorrect",
        "timeSpent",
        "pointsEarned",
        "hintUsed",
        "playedAt",
      ],
    },
    KNOWLEDGE_NOTEBOOK: {
      name: "Knowledge_Notebook",
      idPrefix: "NOTE",
      columns: [
        "noteId",
        "topicId",
        "questionId",
        "title",
        "content",
        "tags",
        "savedAt",
      ],
    },
    AI_EVALUATIONS: {
      name: "AI_Evaluations",
      idPrefix: "EVAL",
      columns: [
        "evaluationId",
        "topicId",
        "accuracyScore",
        "speedScore",
        "logicScore",
        "consistencyScore",
        "finalScore",
        "estimatedLevel",
        "strengths",
        "weaknesses",
        "recommendNextTopic",
        "evaluatedAt",
      ],
    },
    ACHIEVEMENTS: {
      name: "Achievements",
      idPrefix: "UACH",
      columns: [
        "userAchievementId",
        "achievementId",
        "title",
        "points",
        "unlockedAt",
      ],
    },
    SESSION_LOGS: {
      name: "Session_Logs",
      idPrefix: "SES",
      columns: ["sessionId", "loginAt", "logoutAt", "device", "ipAddress"],
    },

    // ========== AI LEARNING SYSTEM SHEETS ==========

    WRONG_ANSWER_MEMORY: {
      name: "Wrong_Answer_Memory",
      idPrefix: "WAM",
      columns: [
        "memoryId", // WAM001, WAM002...
        "questionId", // AIQ hoặc MCQ ID
        "topicId",
        "conceptId", // Khái niệm đã hiểu sai
        "questionText", // Lưu câu hỏi để reference
        "userAnswer", // Đáp án user chọn
        "correctAnswer", // Đáp án đúng
        "wrongCount", // Số lần sai (1, 2, 3...)
        "lastAttempt", // Timestamp lần làm cuối
        "nextReviewDate", // Spaced repetition: 1h, 1d, 3d, 7d, 14d
        "reviewStage", // 0=1h, 1=1d, 2=3d, 3=7d, 4=14d
        "priority", // 1-5 (cao = cần ôn gấp)
        "isCleared", // false cho đến khi đúng liên tiếp
        "clearedAt",
        "variantsAttempted", // JSON: ["AIQ001", "AIQ005", "AIQ012"]
        "notes", // Ghi chú người dùng
      ],
    },

    AI_LEARNING_SESSIONS: {
      name: "AI_Learning_Sessions",
      idPrefix: "ALS",
      columns: [
        "sessionId", // ALS001...
        "topicId",
        "startedAt",
        "completedAt",
        "lessonViewed", // boolean (0/1)
        "mindmapViewed", // boolean
        "infographicViewed", // boolean
        "flashcardsTotal", // Tổng số flashcards
        "flashcardsReviewed", // Số đã xem
        "quizAttempted", // boolean
        "quizScore", // Điểm quiz
        "quizAccuracy", // % đúng
        "totalTimeSpent", // Phút
        "scrollDepth", // % nội dung đã đọc
        "interactionCount", // clicks, hovers, etc.
        "wrongAnswersCount", // Số câu sai trong session
        "newConceptsLearned", // Số concepts mới
        "feedbackScore", // 1-5 stars
        "feedbackText", // User feedback
      ],
    },

    FLASHCARD_PROGRESS: {
      name: "Flashcard_Progress",
      idPrefix: "FCP",
      columns: [
        "cardId", // FCP001...
        "topicId",
        "cardFront", // Thuật ngữ/câu hỏi
        "cardBack", // Định nghĩa/đáp án
        "sourceConceptId", // ID khái niệm nguồn
        "difficultyRating", // easy|medium|hard (tự đánh giá)
        "timesReviewed", // Số lần đã xem
        "timesCorrect", // Số lần nhớ đúng
        "lastReviewed", // Timestamp
        "nextReview", // Spaced repetition schedule
        "reviewStage", // 0=new, 1=learning, 2=reviewing, 3=mastered
        "isMemorized", // true khi đã thuộc
        "memorizedAt",
      ],
    },
  },
};
