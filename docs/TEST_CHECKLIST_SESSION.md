# ✅ Quick Test Checklist - SessionStorage

## 🧪 Test trong 3 phút

### Test 1: Auto Logout Khi Đóng Tab ⏱️ 1 phút

```
1. ✅ Mở Web App
2. ✅ Đăng nhập (email/password hoặc Google)
3. ✅ Verify: Đã vào Dashboard
4. ✅ Mở DevTools (F12) → Console
5. ✅ Run: console.log(sessionStorage.getItem("currentUser"))
   → Should see: {"userId":"xxx", "username":"xxx", ...}
6. ✅ ĐÓNG TAB (không phải minimize!)
7. ✅ Mở lại Web App URL
8. ✅ Verify: Đã về trang Landing (chưa login)
9. ✅ Mở Console lại
10. ✅ Run: console.log(sessionStorage.getItem("currentUser"))
    → Should see: null
```

**Expected Result:** ✅ Phải đăng nhập lại

---

### Test 2: Vẫn Login Sau Refresh ⏱️ 30 giây

```
1. ✅ Mở Web App
2. ✅ Đăng nhập
3. ✅ Verify: Đã vào Dashboard
4. ✅ Nhấn F5 (Refresh)
5. ✅ Verify: Vẫn ở Dashboard (không bị logout)
```

**Expected Result:** ✅ Vẫn đăng nhập

---

### Test 3: Không Share Session Giữa Tabs ⏱️ 1 phút

```
1. ✅ TAB 1: Mở Web App
2. ✅ TAB 1: Đăng nhập
3. ✅ TAB 1: Verify: Đã vào Dashboard
4. ✅ TAB 2: Mở Web App URL (tab mới)
5. ✅ TAB 2: Verify: Đang ở Landing page (chưa login)
6. ✅ TAB 2: Đăng nhập lại
7. ✅ Verify: 2 tabs có thể có 2 user khác nhau
```

**Expected Result:** ✅ Mỗi tab độc lập

---

### Test 4: Browser DevTools Check ⏱️ 30 giây

```
1. ✅ Mở Web App
2. ✅ Đăng nhập
3. ✅ F12 → Application tab
4. ✅ Sidebar: Storage → Session Storage
5. ✅ Chọn domain của app
6. ✅ Verify: Có key "currentUser"
7. ✅ Click vào xem value (JSON user data)
8. ✅ Đóng tab → Mở lại
9. ✅ F12 → Application → Session Storage
10. ✅ Verify: KHÔNG còn "currentUser"
```

**Expected Result:** ✅ sessionStorage rỗng sau khi đóng tab

---

## 🚨 Nếu Fail Test

### Test 1 Fail (Vẫn login sau khi đóng tab)

```
Nguyên nhân: Browser cache hoặc code chưa deploy
Fix:
1. Hard refresh: Ctrl+Shift+R
2. Hoặc Incognito mode
3. Check Console có error không
```

### Test 2 Fail (Logout sau khi refresh)

```
Nguyên nhân: Code có bug
Fix:
1. Check Console logs
2. Verify line ~22 trong client_js.html:
   sessionStorage.getItem("currentUser")
3. Report bug với screenshot
```

### Test 3 Fail (Tabs share session)

```
Nguyên nhân: Vẫn dùng localStorage ở đâu đó
Fix:
1. Search trong client_js.html:
   - Tìm "localStorage"
   - Phải chỉ còn 2 chỗ (email verification)
2. clasp push lại
```

---

## 📊 Expected Console Output

### Sau khi Login

```javascript
// Console
Loading dashboard data...
Current user: {userId: "xxx", username: "xxx", ...}
```

### Sau khi Đóng Tab → Mở Lại

```javascript
// Console
App initialized
// Không có "Current user:" message
```

---

## ✅ All Tests Passed?

Nếu tất cả 4 tests đều pass:

- ✅ sessionStorage hoạt động đúng
- ✅ Auto logout khi đóng tab
- ✅ Session độc lập giữa các tabs
- ✅ Deploy thành công!

---

## 🎯 Quick Commands

```powershell
# Deploy
cd "e:\New folder\Doan"
clasp push

# Open Apps Script
clasp open

# Check logs (nếu có lỗi backend)
clasp logs
```

---

**Time Required:** 3 minutes  
**Difficulty:** Easy  
**Status:** Ready to test
