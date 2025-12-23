# 📘 HƯỚNG DẪN SETUP GEMINI AI - Phase 1

## ✅ Phase 1 đã hoàn thành những gì?

### 1. Database Schema mới (MASTER_DB)

| Table                | Mục đích                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `AI_Content_Cache`   | Cache nội dung AI (mindmap, flashcards, infographic...) - TTL 30 ngày |
| `AI_Question_Pool`   | Kho câu hỏi AI + variants (tối đa 5 variants/câu)                     |
| `AI_Generation_Logs` | Log mỗi lần gọi Gemini API                                            |

### 2. Database Schema mới (USER_DB - mỗi user)

| Sheet                  | Mục đích                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `Wrong_Answer_Memory`  | Lưu câu sai + lịch ôn theo Spaced Repetition (1h → 1d → 3d → 7d → 14d) |
| `AI_Learning_Sessions` | Track phiên học (lesson, mindmap, flashcards, quiz)                    |
| `Flashcard_Progress`   | Tiến độ từng flashcard                                                 |

### 3. Services mới

| File                           | Chức năng                                |
| ------------------------------ | ---------------------------------------- |
| `services/geminiService.js`    | Kết nối & gọi Gemini API                 |
| `services/aiContentManager.js` | Quản lý AI Content Cache & Question Pool |

### 4. Constants & Helpers (`config/schemas.js`)

```javascript
AI_CONFIG = {
  CACHE_TTL_DAYS: 30,
  AUTO_REGENERATE_ON_DOC_CHANGE: true,
  MAX_VARIANTS_PER_QUESTION: 5,
  SPACED_REPETITION_HOURS: [1, 24, 72, 168, 336], // 1h, 1d, 3d, 7d, 14d
  QUIZ_MIX: {
    WRONG_CONCEPTS: 40%,
    NEW_QUESTIONS: 30%,
    REINFORCEMENT: 20%,
    CHALLENGE: 10%
  }
}
```

---

## 🔧 CÁC BƯỚC SETUP TIẾP THEO

### Bước 1: Lấy Gemini API Key

1. Truy cập: https://makersuite.google.com/app/apikey
2. Đăng nhập với Google Account
3. Click **"Create API Key"**
4. Copy API Key

### Bước 2: Setup API Key trong Google Apps Script

1. Mở Google Apps Script Editor
2. Vào menu **Run** → Chọn function `ADMIN_setupGeminiApiKey`
3. **HOẶC** chạy trực tiếp trong Editor:

```javascript
function setupMyGeminiKey() {
  GeminiService.setupApiKey("YOUR_ACTUAL_API_KEY_HERE");
}
```

4. Chạy function và kiểm tra Logs

### Bước 3: Test kết nối

Chạy function: `ADMIN_testGeminiConnection`

Kết quả mong đợi:

```json
{
  "success": true,
  "message": "✅ Gemini API kết nối thành công!",
  "model": "gemini-1.5-flash"
}
```

### Bước 4: Tạo các sheets mới trong MASTER_DB

Chạy function: `createAllSheets`

Điều này sẽ tạo 3 sheets mới:

- AI_Content_Cache
- AI_Question_Pool
- AI_Generation_Logs

### Bước 5: Verify USER_DB sheets

Khi user truy cập Topic learning, hệ thống tự động tạo 3 sheets mới trong USER_DB:

- Wrong_Answer_Memory
- AI_Learning_Sessions
- Flashcard_Progress

---

## 📋 CHECKLIST PHASE 1

- [ ] Gemini API Key đã lấy
- [ ] API Key đã setup trong Script Properties
- [ ] Test connection thành công
- [ ] MASTER_DB có 3 sheets AI mới
- [ ] Test với 1 user - USER_DB có 3 sheets AI mới

---

## 🚀 PHASE 2 SẼ LÀM GÌ?

1. **Prompt Templates** - Các mẫu prompt cho từng loại content
2. **Content Generation Functions**:
   - `generateMindmap(docContent)`
   - `generateInfographic(docContent)`
   - `generateFlashcards(docContent)`
   - `generateQuestions(docContent)`
3. **Document Analysis** - Phân tích Google Doc content
4. **Auto-regenerate trigger** - Khi doc thay đổi

---

## ❓ TROUBLESHOOTING

### Lỗi "API Key not found"

→ Chạy lại `GeminiService.setupApiKey("YOUR_KEY")`

### Lỗi "Sheet not found"

→ Chạy `createAllSheets()` để tạo sheets mới

### Lỗi "429 Too Many Requests"

→ Gemini có rate limit 60 req/min. Đợi 1 phút rồi thử lại.

### Lỗi "Permission denied" khi đọc Google Doc

→ Đảm bảo Doc được share với account chạy script hoặc set public.

---

## 📁 CẤU TRÚC FILES ĐÃ THAY ĐỔI

```
Doan/
├── config/
│   └── schemas.js          ✅ Updated (thêm AI_CONFIG, 3 MASTER tables, 3 USER sheets)
├── database/
│   ├── masterDb.js         ✅ Không thay đổi (đã có logic tạo sheets)
│   └── userDb.js           ✅ Updated (thêm WrongAnswerMemory, AILearningSessions, FlashcardProgress)
└── services/
    ├── geminiService.js    ✅ NEW (Gemini API integration)
    └── aiContentManager.js ✅ NEW (Content Cache & Question Pool management)
```

---

Khi bạn đã setup xong Gemini API Key, báo tôi để tiếp tục Phase 2! 🚀
