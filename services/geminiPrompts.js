/**
 * geminiPrompts.js - Prompt Templates for AI Content Generation
 *
 * Phase 2: Prompt Templates & Content Generation
 *
 * Các loại content:
 * - Document Analysis
 * - Mindmap/Lesson Summary
 * - Infographic (Key Takeaways)
 * - Flashcards
 * - MCQ Questions
 * - Question Variants
 */

// ========== PROMPT TEMPLATES ==========

const PROMPT_TEMPLATES = {
  /**
   * Phân tích tài liệu - Bước đầu tiên
   */
  DOCUMENT_ANALYSIS: `Bạn là chuyên gia giáo dục. Phân tích tài liệu học tập sau và trả về JSON.

=== TÀI LIỆU ===
{docContent}
=== KẾT THÚC TÀI LIỆU ===

Yêu cầu phân tích và trả về CHÍNH XÁC format JSON sau (không có text khác):
{
  "mainTopic": "Chủ đề chính của tài liệu",
  "summary": "Tóm tắt 2-3 câu về nội dung",
  "keyConcepts": [
    {
      "id": "CON001",
      "name": "Tên khái niệm",
      "description": "Mô tả ngắn gọn"
    }
  ],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedReadTime": 10,
  "learningObjectives": [
    "Mục tiêu học tập 1",
    "Mục tiêu học tập 2"
  ],
  "prerequisites": ["Kiến thức cần biết trước"],
  "keyTerms": ["Thuật ngữ quan trọng 1", "Thuật ngữ quan trọng 2"]
}

QUAN TRỌNG:
- Chỉ sử dụng thông tin từ tài liệu trên
- KHÔNG thêm kiến thức bên ngoài
- estimatedReadTime tính bằng phút
- Tối đa 10 keyConcepts
- Tối đa 5 learningObjectives`,

  /**
   * Tạo Mindmap/Sơ đồ tư duy
   */
  MINDMAP_GENERATION: `Bạn là chuyên gia tạo sơ đồ tư duy giáo dục. Tạo mindmap từ tài liệu sau.

=== TÀI LIỆU ===
{docContent}
=== KẾT THÚC TÀI LIỆU ===

Phân tích: {analysis}

Trả về CHÍNH XÁC format JSON sau (ĐỒNG BỘ với frontend):
{
  "title": "Tiêu đề chính",
  "centralIdea": "Ý tưởng trung tâm (1 câu)",
  "nodes": [
    {
      "id": "N1",
      "name": "Nhánh chính 1",
      "color": "#4285f4",
      "icon": "📚",
      "children": [
        {
          "id": "N1.1",
          "name": "Ý con 1",
          "note": "Ghi chú ngắn (optional)"
        },
        {
          "id": "N1.2",
          "name": "Ý con 2"
        }
      ]
    },
    {
      "id": "N2",
      "name": "Nhánh chính 2",
      "color": "#34a853",
      "icon": "💡",
      "children": []
    }
  ],
  "connections": [
    {
      "from": "N1.1",
      "to": "N2",
      "label": "Liên quan"
    }
  ]
}

YÊU CẦU:
- 3-6 nhánh chính (dùng key "nodes" thay vì "branches")
- Mỗi nhánh có "name" thay vì "label"
- Mỗi nhánh có 2-4 "children" (cũng dùng "name")
- Dùng emoji phù hợp với nội dung
- Màu sắc khác nhau cho mỗi nhánh
- connections là các mối liên hệ giữa các ý (optional)
- CHỈ dùng kiến thức trong tài liệu`,

  /**
   * Tạo Infographic - Key Takeaways
   */
  INFOGRAPHIC_GENERATION: `Bạn là designer infographic giáo dục. Tạo các thẻ key takeaways từ tài liệu.

=== TÀI LIỆU ===
{docContent}
=== KẾT THÚC TÀI LIỆU ===

Phân tích: {analysis}

Trả về CHÍNH XÁC format JSON sau:
{
  "title": "Tiêu đề infographic",
  "subtitle": "Phụ đề ngắn",
  "cards": [
    {
      "id": "KEY1",
      "icon": "🎯",
      "title": "Tiêu đề key point",
      "description": "Mô tả 1-2 câu ngắn gọn, dễ nhớ",
      "highlight": "Từ khóa quan trọng",
      "color": "#4285f4",
      "priority": 1
    },
    {
      "id": "KEY2",
      "icon": "💡",
      "title": "Key point 2",
      "description": "Mô tả ngắn gọn",
      "highlight": "Từ khóa",
      "color": "#34a853",
      "priority": 2
    }
  ],
  "footer": {
    "tip": "Mẹo ghi nhớ hoặc áp dụng",
    "nextStep": "Bước tiếp theo để học sâu hơn"
  }
}

YÊU CẦU:
- 5-7 cards (key takeaways)
- Mỗi card có icon emoji phù hợp
- description ngắn gọn, súc tích, dễ nhớ
- highlight là từ/cụm từ quan trọng nhất
- priority từ 1 (quan trọng nhất) đến 7
- Màu sắc đa dạng, dễ phân biệt
- CHỈ dùng kiến thức trong tài liệu`,

  /**
   * Tạo Flashcards
   */
  FLASHCARD_GENERATION: `Bạn là chuyên gia tạo flashcard học tập. Tạo bộ flashcards từ tài liệu.

=== TÀI LIỆU ===
{docContent}
=== KẾT THÚC TÀI LIỆU ===

Phân tích: {analysis}

Trả về CHÍNH XÁC format JSON sau (ĐỒNG BỘ với frontend):
{
  "deckTitle": "Tên bộ flashcard",
  "totalCards": 15,
  "cards": [
    {
      "id": "FC001",
      "conceptId": "CON001",
      "term": "Thuật ngữ hoặc câu hỏi",
      "definition": "Định nghĩa hoặc đáp án",
      "hint": "Gợi ý nhỏ (optional)",
      "example": "Ví dụ minh họa (optional)",
      "mnemonic": "Cách ghi nhớ (optional)",
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"]
    }
  ]
}

YÊU CẦU:
- Tạo {cardCount} flashcards
- Mỗi card có "term" (mặt trước) và "definition" (mặt sau) - ĐỠN GIẢN
- KHÔNG dùng cấu trúc phức tạp { front: { content: "..." } }
- "term" và "definition" là STRING trực tiếp
- Ưu tiên khái niệm khó, dễ nhầm lẫn
- Mặt trước ngắn gọn, rõ ràng
- Mặt sau có giải thích đầy đủ
- Thêm ví dụ khi có thể
- mnemonic giúp ghi nhớ (nếu phù hợp)
- CHỈ dùng kiến thức trong tài liệu`,

  /**
   * Tạo câu hỏi MCQ
   */
  MCQ_GENERATION: `Bạn là chuyên gia soạn câu hỏi trắc nghiệm. Tạo bộ câu hỏi MCQ từ tài liệu.

=== TÀI LIỆU ===
{docContent}
=== KẾT THÚC TÀI LIỆU ===

Phân tích: {analysis}
Độ khó yêu cầu: {difficulty}
Các khái niệm cần tập trung: {focusConcepts}

Trả về CHÍNH XÁC format JSON sau:
{
  "quizTitle": "Tên bài quiz",
  "totalQuestions": 20,
  "questions": [
    {
      "id": "Q001",
      "conceptId": "CON001",
      "bloomLevel": "remember|understand|apply|analyze",
      "difficulty": "easy|medium|hard",
      "questionType": "single_choice|scenario|definition|application",
      "question": "Nội dung câu hỏi?",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": 1,
      "explanation": "Giải thích tại sao đáp án số 1 (B) đúng và các đáp án khác sai",
      "hint": "Gợi ý nhẹ nếu học sinh gặp khó khăn",
      "relatedConcepts": ["CON001", "CON002"]
    }
  ]
}

LƯU Ý FORMAT:
- "options" phải là mảng 4 chuỗi (không phải object)
- "correctAnswer" là số từ 0-3 (index của đáp án đúng, không phải chữ A/B/C/D)
- Ví dụ: correctAnswer = 0 nghĩa là đáp án đầu tiên đúng
- Ví dụ: correctAnswer = 1 nghĩa là đáp án thứ hai đúng

YÊU CẦU:
- Tạo {questionCount} câu hỏi
- Phân bố Bloom's Taxonomy:
  + 30% remember (nhớ)
  + 30% understand (hiểu)
  + 25% apply (áp dụng)
  + 15% analyze (phân tích)
- Phân bố độ khó: 30% easy, 50% medium, 20% hard
- Đáp án sai phải hợp lý (không quá hiển nhiên)
- explanation chi tiết, giáo dục
- CHỈ dùng kiến thức trong tài liệu
- KHÔNG hỏi những thông tin không có trong tài liệu`,

  /**
   * Tạo variant cho câu hỏi (khi user trả lời sai)
   */
  QUESTION_VARIANT: `Bạn là chuyên gia giáo dục. Biến đổi câu hỏi sau thành dạng khác để kiểm tra lại kiến thức.

=== CÂU HỎI GỐC ===
{originalQuestion}
=== KẾT THÚC ===

Loại biến đổi yêu cầu: {variantType}

Các loại biến đổi:
- rephrased: Giữ nguyên ý, đổi cách diễn đạt
- scenario: Đặt vào tình huống thực tế/ví dụ cụ thể
- inverse: Hỏi ngược lại (VD: "KHÔNG phải là...", "ngoại trừ...")
- application: Yêu cầu áp dụng kiến thức vào bài toán mới

Trả về CHÍNH XÁC format JSON sau:
{
  "variantType": "{variantType}",
  "question": "Câu hỏi đã biến đổi",
  "options": ["Đáp án A mới", "Đáp án B mới", "Đáp án C mới", "Đáp án D mới"],
  "correctAnswer": 2,
  "explanation": "Giải thích chi tiết",
  "hint": "Gợi ý",
  "changeNotes": "Mô tả ngắn về sự thay đổi so với câu gốc"
}

LƯU Ý FORMAT:
- "options" phải là mảng 4 chuỗi (không phải object)
- "correctAnswer" là số từ 0-3 (index của đáp án đúng)

YÊU CẦU:
- Giữ nguyên khái niệm cốt lõi cần kiểm tra
- Thay đổi đủ để không nhận ra là câu hỏi cũ
- Đáp án đúng có thể khác vị trí với câu gốc
- Độ khó tương đương hoặc cao hơn một chút`,

  /**
   * Tạo bài học tóm tắt (Lesson Summary)
   */
  LESSON_SUMMARY: `Bạn là giáo viên giỏi. Tạo bài giảng tóm tắt từ tài liệu sau.

=== TÀI LIỆU ===
{docContent}
=== KẾT THÚC TÀI LIỆU ===

Phân tích: {analysis}

Trả về CHÍNH XÁC format JSON sau:
{
  "title": "Tiêu đề bài học",
  "introduction": {
    "hook": "Câu mở đầu thu hút (1-2 câu)",
    "overview": "Tổng quan bài học (2-3 câu)",
    "objectives": ["Mục tiêu 1", "Mục tiêu 2"]
  },
  "sections": [
    {
      "id": "SEC1",
      "title": "Tiêu đề phần 1",
      "icon": "📖",
      "content": "Nội dung chính của phần này (markdown format)",
      "keyPoints": ["Điểm chính 1", "Điểm chính 2"],
      "example": "Ví dụ minh họa (nếu có)",
      "tip": "Mẹo hoặc lưu ý quan trọng"
    }
  ],
  "summary": {
    "recap": "Tóm tắt 3-5 điểm quan trọng nhất",
    "remember": ["Cần nhớ 1", "Cần nhớ 2", "Cần nhớ 3"]
  },
  "selfCheck": [
    {
      "question": "Câu hỏi tự kiểm tra 1?",
      "answer": "Đáp án ngắn gọn"
    }
  ]
}

YÊU CẦU:
- 3-5 sections (phần)
- Mỗi section có content rõ ràng, dễ hiểu
- Dùng markdown trong content (**, *, -)
- Thêm ví dụ khi có thể
- selfCheck có 3-5 câu hỏi đơn giản
- CHỈ dùng kiến thức trong tài liệu
- Ngôn ngữ thân thiện, dễ tiếp cận`,
};

// ========== CONTENT GENERATOR ==========

const ContentGenerator = {
  /**
   * Phân tích tài liệu - Bước 1 bắt buộc
   * @param {string} docContent - Nội dung Google Doc
   * @returns {Object} Analysis result
   */
  analyzeDocument: function (docContent) {
    const prompt = PROMPT_TEMPLATES.DOCUMENT_ANALYSIS.replace(
      "{docContent}",
      docContent
    );

    const result = GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.3, // Thấp để có kết quả nhất quán
      maxTokens: 2048,
    });

    return result;
  },

  /**
   * Tạo Mindmap
   * @param {string} docContent
   * @param {Object} analysis - Kết quả từ analyzeDocument
   * @returns {Object} Mindmap data
   */
  generateMindmap: function (docContent, analysis) {
    const prompt = PROMPT_TEMPLATES.MINDMAP_GENERATION.replace(
      "{docContent}",
      docContent
    ).replace("{analysis}", JSON.stringify(analysis));

    return GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.5,
      maxTokens: 3000,
    });
  },

  /**
   * Tạo Infographic
   * @param {string} docContent
   * @param {Object} analysis
   * @returns {Object} Infographic data
   */
  generateInfographic: function (docContent, analysis) {
    const prompt = PROMPT_TEMPLATES.INFOGRAPHIC_GENERATION.replace(
      "{docContent}",
      docContent
    ).replace("{analysis}", JSON.stringify(analysis));

    return GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.5,
      maxTokens: 2500,
    });
  },

  /**
   * Tạo Flashcards
   * @param {string} docContent
   * @param {Object} analysis
   * @param {number} cardCount - Số lượng flashcards (default 15)
   * @returns {Object} Flashcards data
   */
  generateFlashcards: function (docContent, analysis, cardCount = 15) {
    const prompt = PROMPT_TEMPLATES.FLASHCARD_GENERATION.replace(
      "{docContent}",
      docContent
    )
      .replace("{analysis}", JSON.stringify(analysis))
      .replace("{cardCount}", cardCount.toString());

    return GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.6,
      maxTokens: 4000,
    });
  },

  /**
   * Tạo câu hỏi MCQ
   * @param {string} docContent
   * @param {Object} analysis
   * @param {Object} options - { questionCount, difficulty, focusConcepts }
   * @returns {Object} Questions data
   */
  generateQuestions: function (docContent, analysis, options = {}) {
    const questionCount = options.questionCount || 20;
    const difficulty = options.difficulty || "mixed";
    const focusConcepts = options.focusConcepts || [];

    const prompt = PROMPT_TEMPLATES.MCQ_GENERATION.replace(
      "{docContent}",
      docContent
    )
      .replace("{analysis}", JSON.stringify(analysis))
      .replace("{questionCount}", questionCount.toString())
      .replace("{difficulty}", difficulty)
      .replace(
        "{focusConcepts}",
        focusConcepts.length > 0 ? focusConcepts.join(", ") : "Tất cả"
      );

    return GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.7,
      maxTokens: 8000,
      model: AI_CONFIG.GEMINI_MODEL_ADVANCED, // Dùng model mạnh hơn
    });
  },

  /**
   * Tạo variant cho câu hỏi
   * @param {Object} originalQuestion
   * @param {string} variantType - rephrased|scenario|inverse|application
   * @returns {Object} Variant question
   */
  generateQuestionVariant: function (originalQuestion, variantType) {
    const prompt = PROMPT_TEMPLATES.QUESTION_VARIANT.replace(
      "{originalQuestion}",
      JSON.stringify(originalQuestion)
    ).replace(/{variantType}/g, variantType);

    return GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.7,
      maxTokens: 1500,
    });
  },

  /**
   * Tạo bài học tóm tắt
   * @param {string} docContent
   * @param {Object} analysis
   * @returns {Object} Lesson summary data
   */
  generateLessonSummary: function (docContent, analysis) {
    const prompt = PROMPT_TEMPLATES.LESSON_SUMMARY.replace(
      "{docContent}",
      docContent
    ).replace("{analysis}", JSON.stringify(analysis));

    return GeminiService.callWithRetry(prompt, {
      expectJson: true,
      temperature: 0.5,
      maxTokens: 5000,
    });
  },
};

// ========== TOPIC CONTENT ORCHESTRATOR ==========

const TopicContentOrchestrator = {
  /**
   * Generate tất cả content cho một topic
   * @param {string} topicId
   * @param {string} contentDocId - Google Doc ID
   * @param {string} userId - User trigger generation
   * @param {Object} options - { forceRegenerate, contentTypes }
   * @returns {Object} All generated content
   */
  generateAllContent: function (topicId, contentDocId, userId, options = {}) {
    const startTime = Date.now();
    const logId = GeminiService.logGeneration({
      userId: userId,
      topicId: topicId,
      requestType: "full_analysis",
      inputDocId: contentDocId,
      status: "pending",
    });

    try {
      // Step 1: Đọc Google Doc
      Logger.log("📄 Step 1: Reading Google Doc...");
      const docResult = GeminiService.readGoogleDoc(contentDocId);
      if (!docResult.success) {
        throw new Error("Cannot read Google Doc: " + docResult.error);
      }

      const docContent = docResult.content;
      const docLastModified = docResult.lastModified;

      // Check cache validity
      if (!options.forceRegenerate) {
        const cachedContent = AIContentCache.getAllForTopic(topicId);
        if (Object.keys(cachedContent).length > 0) {
          // Check if doc modified
          const firstCache = Object.values(cachedContent)[0];
          if (
            !shouldRegenerateContent(
              docLastModified,
              firstCache.docLastModified
            )
          ) {
            Logger.log("✅ Using cached content (doc not modified)");
            GeminiService.updateLogStatus(logId, {
              status: "cache_hit",
              processingTime: Date.now() - startTime,
            });
            return {
              success: true,
              fromCache: true,
              content: cachedContent,
            };
          }
        }
      }

      // Step 2: Analyze Document
      Logger.log("🔍 Step 2: Analyzing document...");
      const analysis = ContentGenerator.analyzeDocument(docContent);
      Logger.log("Analysis complete: " + analysis.mainTopic);

      // Step 3: Generate all content types
      const results = {
        analysis: analysis,
      };

      const contentTypes = options.contentTypes || [
        "mindmap",
        "infographic",
        "flashcards",
        "lesson_summary",
        "questions",
      ];

      // Generate Mindmap
      if (contentTypes.includes("mindmap")) {
        Logger.log("🧠 Generating Mindmap...");
        try {
          results.mindmap = ContentGenerator.generateMindmap(
            docContent,
            analysis
          );
          AIContentCache.save({
            topicId: topicId,
            contentDocId: contentDocId,
            contentType: "mindmap",
            generatedContent: results.mindmap,
            docLastModified: docLastModified,
          });
        } catch (e) {
          Logger.log("Error generating mindmap: " + e.toString());
          results.mindmap = { error: e.toString() };
        }
      }

      // Generate Infographic
      if (contentTypes.includes("infographic")) {
        Logger.log("✨ Generating Infographic...");
        try {
          results.infographic = ContentGenerator.generateInfographic(
            docContent,
            analysis
          );
          AIContentCache.save({
            topicId: topicId,
            contentDocId: contentDocId,
            contentType: "infographic",
            generatedContent: results.infographic,
            docLastModified: docLastModified,
          });
        } catch (e) {
          Logger.log("Error generating infographic: " + e.toString());
          results.infographic = { error: e.toString() };
        }
      }

      // Generate Flashcards
      if (contentTypes.includes("flashcards")) {
        Logger.log("🃏 Generating Flashcards...");
        try {
          results.flashcards = ContentGenerator.generateFlashcards(
            docContent,
            analysis,
            15
          );
          AIContentCache.save({
            topicId: topicId,
            contentDocId: contentDocId,
            contentType: "flashcards",
            generatedContent: results.flashcards,
            docLastModified: docLastModified,
          });
        } catch (e) {
          Logger.log("Error generating flashcards: " + e.toString());
          results.flashcards = { error: e.toString() };
        }
      }

      // Generate Lesson Summary
      if (contentTypes.includes("lesson_summary")) {
        Logger.log("📖 Generating Lesson Summary...");
        try {
          results.lesson_summary = ContentGenerator.generateLessonSummary(
            docContent,
            analysis
          );
          AIContentCache.save({
            topicId: topicId,
            contentDocId: contentDocId,
            contentType: "lesson_summary",
            generatedContent: results.lesson_summary,
            docLastModified: docLastModified,
          });
        } catch (e) {
          Logger.log("Error generating lesson summary: " + e.toString());
          results.lesson_summary = { error: e.toString() };
        }
      }

      // Generate Questions
      if (contentTypes.includes("questions")) {
        Logger.log("❓ Generating Questions...");
        try {
          results.questions = ContentGenerator.generateQuestions(
            docContent,
            analysis,
            { questionCount: 20 }
          );
          AIContentCache.save({
            topicId: topicId,
            contentDocId: contentDocId,
            contentType: "questions",
            generatedContent: results.questions,
            docLastModified: docLastModified,
          });

          // Also save questions to AI_Question_Pool
          if (results.questions.questions) {
            results.questions.questions.forEach((q) => {
              try {
                AIQuestionPool.addQuestion({
                  topicId: topicId,
                  baseConceptId: q.conceptId,
                  questionText: q.question,
                  optionA: q.options.A,
                  optionB: q.options.B,
                  optionC: q.options.C,
                  optionD: q.options.D,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation,
                  difficulty: q.difficulty,
                  bloomLevel: q.bloomLevel,
                  variantType: "original",
                  createdBy: "AI",
                });
              } catch (qe) {
                Logger.log("Error saving question to pool: " + qe.toString());
              }
            });
          }
        } catch (e) {
          Logger.log("Error generating questions: " + e.toString());
          results.questions = { error: e.toString() };
        }
      }

      // Update log
      const processingTime = Date.now() - startTime;
      GeminiService.updateLogStatus(logId, {
        status: "success",
        outputItemsCount: Object.keys(results).length,
        processingTime: processingTime,
      });

      Logger.log(
        "✅ All content generated in " +
          (processingTime / 1000).toFixed(1) +
          "s"
      );

      return {
        success: true,
        fromCache: false,
        content: results,
        processingTime: processingTime,
      };
    } catch (error) {
      Logger.log("❌ Error in generateAllContent: " + error.toString());
      GeminiService.updateLogStatus(logId, {
        status: "failed",
        errorMessage: error.toString(),
        processingTime: Date.now() - startTime,
      });

      return {
        success: false,
        error: error.toString(),
      };
    }
  },

  /**
   * Get content cho topic (từ cache hoặc generate mới)
   * @param {string} topicId
   * @param {string} contentDocId
   * @param {string} userId
   * @returns {Object}
   */
  getTopicContent: function (topicId, contentDocId, userId) {
    // Try cache first
    const cached = AIContentCache.getAllForTopic(topicId);
    if (Object.keys(cached).length >= 4) {
      // Có ít nhất 4 loại content
      Logger.log("📦 Returning cached content for topic: " + topicId);
      return {
        success: true,
        fromCache: true,
        content: cached,
      };
    }

    // Generate new
    return this.generateAllContent(topicId, contentDocId, userId);
  },

  /**
   * Regenerate một loại content cụ thể
   * @param {string} topicId
   * @param {string} contentDocId
   * @param {string} contentType
   * @param {string} userId
   * @returns {Object}
   */
  regenerateContent: function (topicId, contentDocId, contentType, userId) {
    // Invalidate old cache
    AIContentCache.invalidate(topicId, contentType);

    // Generate only specified type
    return this.generateAllContent(topicId, contentDocId, userId, {
      forceRegenerate: true,
      contentTypes: [contentType],
    });
  },
};

// ========== ADMIN/TEST FUNCTIONS ==========

/**
 * [TEST] Test Content Generation với một Google Doc
 */
function TEST_generateContent() {
  // Google Doc ID của Topic 1
  const TEST_DOC_ID = "19UAHFVkxt0K_MrjqlZw0cUGYuULbJG7ak1xYnS0ogMw";
  const TEST_TOPIC_ID = "TOP001";
  const TEST_USER_ID = "USR001";

  const result = TopicContentOrchestrator.generateAllContent(
    TEST_TOPIC_ID,
    TEST_DOC_ID,
    TEST_USER_ID
  );

  Logger.log("=== RESULT ===");
  Logger.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * [TEST] Test analyze document only
 */
function TEST_analyzeDocument() {
  const TEST_DOC_ID = "19UAHFVkxt0K_MrjqlZw0cUGYuULbJG7ak1xYnS0ogMw";

  const docResult = GeminiService.readGoogleDoc(TEST_DOC_ID);
  if (!docResult.success) {
    Logger.log("Error: " + docResult.error);
    return;
  }

  Logger.log("📄 Document: " + docResult.title);
  Logger.log("📝 Word count: " + docResult.wordCount);
  Logger.log("🔍 Analyzing...");

  const analysis = ContentGenerator.analyzeDocument(docResult.content);
  Logger.log("=== ANALYSIS ===");
  Logger.log(JSON.stringify(analysis, null, 2));

  return analysis;
}

/**
 * [TEST] Test generate question variant
 */
function TEST_generateVariant() {
  const originalQuestion = {
    question: "HTTP là viết tắt của từ gì?",
    options: {
      A: "Hyper Text Transfer Protocol",
      B: "High Tech Transfer Protocol",
      C: "Hyper Technical Transfer Program",
      D: "Home Text Transfer Protocol",
    },
    correctAnswer: "A",
    explanation: "HTTP = Hyper Text Transfer Protocol",
  };

  const variant = ContentGenerator.generateQuestionVariant(
    originalQuestion,
    "scenario"
  );
  Logger.log(JSON.stringify(variant, null, 2));

  return variant;
}
