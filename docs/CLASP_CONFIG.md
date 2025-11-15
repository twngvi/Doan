# 🔧 File Configuration for Deployment

## .clasp.json Configuration

Để deploy đúng cách, cập nhật file `.clasp.json`:

```json
{
  "scriptId": "1MjL3lfc9h3hXIO86tuj2syxy2flQ4_E9lqARe6nqYJDQj8S4VsftmXW5",
  "rootDir": "backend",
  "scriptExtensions": [".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"],
  "filePushOrder": ["main.gs", "utils.gs", "users.gs"],
  "skipSubdirectories": false
}
```

**Lưu ý**:

- `rootDir`: Chỉ định thư mục `backend` làm root để push
- Tất cả các file `.gs` và `.html` trong `backend/` sẽ được push lên Apps Script

## File Structure Mapping

### Backend Files (sẽ được push)

```
backend/
├── main.gs              → main.gs (Apps Script)
├── users.gs             → users.gs (Apps Script)
├── utils.gs             → utils.gs (Apps Script)
├── index.html           → index.html
├── styles.html          → styles.html
├── client_js.html       → client_js.html
├── page_login.html      → page_login.html
├── page_register.html   → page_register.html
├── page_dashboard.html  → page_dashboard.html
├── page_topics.html     → page_topics.html
├── page_mcq.html        → page_mcq.html
├── page_matching.html   → page_matching.html
└── page_profile.html    → page_profile.html
```

### Config Files (đã có sẵn, giữ nguyên)

```
config/
└── schema.js            → Đã có sẵn trong project

services/
├── [các service files]  → Đã có sẵn, dùng cho tương lai

models/
└── [các model files]    → Đã có sẵn, dùng cho tương lai

utils/
└── [các util files]     → Đã có sẵn, dùng cho tương lai
```

## Integration với Code hiện tại

### Files cần giữ nguyên (không cần push):

- `Code.js` - Entry point cũ
- `triggers.js` - Trigger management
- `config/schema.js` - Database schema
- Các file trong `services/`, `models/`, `utils/` (root level)

### Files mới (trong backend/):

- `main.gs` - Entry point mới cho Web App
- `users.gs` - User authentication
- `utils.gs` - Helper functions
- Các file HTML - Frontend

## Commands để Deploy

### 1. Lần đầu setup

```bash
cd e:\Doanv3
clasp login
# Cập nhật .clasp.json với rootDir: "backend"
```

### 2. Push files lên Apps Script

```bash
clasp push
```

### 3. Deploy Web App

```bash
clasp deploy --description "Doanv3 Web App v1.0"
clasp open --webapp
```

### 4. Khởi tạo Database (chạy trong Apps Script Editor)

```bash
clasp open
# Sau đó chạy initializeDatabase() từ Code.js
```

## Troubleshooting

### Nếu clasp push bị lỗi:

```bash
# Clear và push lại
clasp push --force
```

### Nếu cần xem logs:

```bash
clasp logs
```

### Nếu muốn pull code về:

```bash
clasp pull
```
