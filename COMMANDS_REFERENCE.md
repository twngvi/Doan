# ⚡ Commands Reference - Doanv3

Quick reference cho tất cả commands cần thiết.

---

## 📦 Setup & Login

```powershell
# Cài đặt clasp (lần đầu)
npm install -g @google/clasp

# Đăng nhập Google Apps Script
clasp login

# Kiểm tra version
clasp --version
```

---

## 🔧 Configuration

```powershell
# Di chuyển vào thư mục dự án
cd e:\Doanv3

# Tạo/cập nhật .clasp.json từ example
copy .clasp.json.example .clasp.json

# Hoặc edit thủ công, thêm:
# "rootDir": "backend"
```

---

## 📤 Push & Deploy

```powershell
# Push tất cả file trong backend/ lên Apps Script
clasp push

# Push force (ghi đè tất cả)
clasp push --force

# Watch mode (auto-push khi file thay đổi)
clasp push --watch

# Kiểm tra status
clasp status

# Xem list files đã push
clasp list
```

---

## 🌐 Deploy Web App

```powershell
# Deploy version mới
clasp deploy --description "Version 1.0"

# Xem danh sách deployments
clasp deployments

# Undeploy một deployment
clasp undeploy <deploymentId>

# Mở Web App trong browser
clasp open --webapp

# Mở Apps Script Editor
clasp open
```

---

## 📥 Pull & Clone

```powershell
# Pull code về từ Apps Script
clasp pull

# Clone project khác
clasp clone <scriptId>
```

---

## 🔍 Logs & Debug

```powershell
# Xem logs realtime
clasp logs

# Xem logs với filter
clasp logs --json
clasp logs --open

# Hoặc trong Apps Script Editor:
# View → Logs
```

---

## 🗄️ Database Setup

### Trong Apps Script Editor:

```
1. clasp open
2. Chọn file: Code.js hoặc schema.js
3. Function dropdown: initializeDatabase
4. Click "Run"
5. Cấp quyền khi được hỏi
```

### Hoặc từ command line:

```powershell
clasp run initializeDatabase
```

---

## 🧪 Testing Flow

### Test trong Apps Script Editor:

```
1. clasp open
2. Chọn function muốn test
3. Click "Run"
4. Xem Execution log
```

### Test Web App:

```powershell
# Deploy
clasp deploy --description "Test version"

# Mở trong browser
clasp open --webapp

# Xem logs
clasp logs
```

---

## 📊 Project Management

```powershell
# Xem thông tin project
clasp setting

# List tất cả projects
clasp list

# Tạo project mới
clasp create --title "New Project" --type standalone

# Link project hiện tại với script ID
clasp setting scriptId <YOUR_SCRIPT_ID>
```

---

## 🔄 Update Workflow

```powershell
# 1. Sửa code trong backend/

# 2. Push lên Apps Script
clasp push

# 3. Test trong Editor (optional)
clasp open

# 4. Deploy version mới
clasp deploy --description "Update v1.1"

# 5. Xem logs
clasp logs

# 6. Mở Web App để test
clasp open --webapp
```

---

## 🔐 OAuth & Permissions

```powershell
# Re-login nếu hết phiên
clasp login --creds creds.json

# Logout
clasp logout

# List OAuth scopes trong appsscript.json:
# - https://www.googleapis.com/auth/spreadsheets
# - https://www.googleapis.com/auth/script.external_request
# - https://www.googleapis.com/auth/script.scriptapp
# - https://www.googleapis.com/auth/userinfo.email
```

---

## 📝 File Operations

```powershell
# Tạo file mới (sẽ được push lần sau)
# Tạo trong backend/ folder

# Push file cụ thể (không được hỗ trợ, phải push all)
clasp push

# Xóa tất cả file remote và push lại
clasp push --force
```

---

## 🎯 Common Tasks

### Deploy lần đầu:

```powershell
cd e:\Doanv3
clasp login
clasp push
clasp open  # → Run initializeDatabase()
clasp deploy --description "Initial deploy"
clasp open --webapp
```

### Update sau khi sửa code:

```powershell
cd e:\Doanv3
clasp push
clasp logs  # Xem có lỗi không
clasp deploy --description "Bug fix v1.1"
```

### Debug lỗi:

```powershell
clasp logs          # Xem logs
clasp open          # Vào Editor xem chi tiết
clasp pull          # Pull về so sánh
clasp push --force  # Push lại nếu cần
```

### Backup & Restore:

```powershell
# Backup (pull về local)
clasp pull

# Restore (push từ local)
clasp push --force
```

---

## 🆘 Troubleshooting Commands

### Lỗi authentication:

```powershell
clasp logout
clasp login
clasp push
```

### Lỗi push:

```powershell
clasp status  # Kiểm tra trạng thái
clasp pull    # Pull về xem có conflict không
clasp push --force  # Force push
```

### Lỗi deployment:

```powershell
clasp deployments  # Xem list deployments
clasp undeploy <deploymentId>  # Xóa deployment lỗi
clasp deploy --description "New deploy"  # Deploy lại
```

### Xem chi tiết project:

```powershell
clasp setting
clasp list
```

---

## 📚 Help Commands

```powershell
# Xem help chính
clasp --help

# Xem help cho command cụ thể
clasp push --help
clasp deploy --help
clasp logs --help
```

---

## 🎯 Essential Daily Commands

```powershell
# Workflow hàng ngày:
cd e:\Doanv3          # 1. Vào thư mục
clasp pull            # 2. Pull code mới nhất (nếu làm việc team)
# [Sửa code trong backend/]
clasp push            # 3. Push code lên
clasp logs            # 4. Kiểm tra logs
clasp open --webapp   # 5. Test Web App
```

---

## 🚀 Production Deployment

```powershell
# Chuẩn bị deploy production:
cd e:\Doanv3
clasp pull                          # Sync code
clasp push --force                  # Push clean
clasp deploy --description "v1.0.0" # Deploy version mới

# Get deployment URL:
clasp deployments
# Copy Web app URL từ output

# Test production:
# Mở URL trong browser
# Test full flow: register → login → dashboard

# Monitor:
clasp logs  # Theo dõi logs
```

---

## 📋 Quick Reference Table

| Task             | Command               |
| ---------------- | --------------------- |
| Push code        | `clasp push`          |
| Deploy           | `clasp deploy`        |
| Open Editor      | `clasp open`          |
| Open Web App     | `clasp open --webapp` |
| View logs        | `clasp logs`          |
| List deployments | `clasp deployments`   |
| Check status     | `clasp status`        |
| Force push       | `clasp push --force`  |
| Pull code        | `clasp pull`          |

---

**Tip**: Tạo aliases trong PowerShell profile để gõ nhanh hơn:

```powershell
# Mở PowerShell profile:
notepad $PROFILE

# Thêm aliases:
function cpush { clasp push }
function copen { clasp open --webapp }
function clogs { clasp logs }
function cdeploy { clasp deploy --description $args }
```

Sau đó chỉ cần gõ:

```powershell
cpush
copen
clogs
cdeploy "Version 1.1"
```

---

**Lưu file này để tham khảo nhanh! 📌**
