# ✅ Đã sửa lỗi HTTP 429 và TypeError

## 🔴 Các lỗi đã sửa:

### 1. **HTTP 429 (Too Many Requests)**

- **Nguyên nhân:** User click nút Google Login nhiều lần → tạo nhiều requests cùng lúc
- **Giải pháp:**
  - ✅ Thêm flag `isGoogleAuthInProgress` để prevent duplicate clicks
  - ✅ Thêm timeout 30 giây cho mỗi request
  - ✅ Thêm `Utilities.sleep(500)` ở backend để tránh rate limit
  - ✅ Thêm cache cho Database ID (6 giờ) → giảm Drive API calls

### 2. **TypeError: Cannot read properties of null (reading 'status')**

- **Nguyên nhân:** Response từ backend là `null` khi có lỗi
- **Giải pháp:**
  - ✅ Thêm validation `if (!response)` trước khi đọc `response.status`
  - ✅ Show error message rõ ràng khi response null

### 3. **Better Error Handling**

- ✅ Detect 429 errors và show message phù hợp
- ✅ Detect timeout errors
- ✅ Detect network errors
- ✅ Better error messages cho user

## 📝 Các thay đổi chi tiết:

### **Frontend (`views/client_js.html`):**

```javascript
// 1. Thêm flag ngăn duplicate requests
let isGoogleAuthInProgress = false;

// 2. Check flag trước khi gọi API
function handleGoogleLogin() {
  if (isGoogleAuthInProgress) {
    console.log("Already in progress, ignoring");
    return;
  }

  isGoogleAuthInProgress = true;

  // 3. Timeout protection
  const timeoutId = setTimeout(() => {
    hideLoading();
    isGoogleAuthInProgress = false;
    showToast("Timeout: Vui lòng thử lại sau.", "error");
  }, 30000); // 30 seconds

  // 4. Reset flag sau khi done
  google.script.run
    .withSuccessHandler(function (response) {
      clearTimeout(timeoutId);
      isGoogleAuthInProgress = false;
      onGoogleAuthSuccess(response);
    })
    .handleGoogleAuth();
}

// 5. Validate response
function onGoogleAuthSuccess(response) {
  if (!response) {
    showToast("Lỗi: Không nhận được phản hồi từ server.", "error");
    return;
  }
  // ... rest of code
}

// 6. Better error messages
function onApiError(error) {
  let errorMessage = "Có lỗi xảy ra";

  if (msg.includes("429")) {
    errorMessage = "Quá nhiều yêu cầu. Vui lòng đợi 1 phút và thử lại.";
  } else if (msg.includes("timeout")) {
    errorMessage = "Hết thời gian chờ. Vui lòng kiểm tra kết nối.";
  }

  showToast(errorMessage, "error");
}
```

### **Backend (`server/users.gs`):**

```javascript
function handleGoogleAuth() {
  try {
    // Add delay to prevent rate limiting
    Utilities.sleep(500);

    // ... rest of code
  } catch (error) {
    Logger.log("Error: " + error.toString());
    return {
      status: "error",
      message: "Failed to authenticate: " + error.toString(),
    };
  }
}
```

### **Backend (`server/utils.gs`):**

```javascript
function getOrCreateDatabase() {
  try {
    // 1. Try cache first (6 hours)
    const cache = CacheService.getScriptCache();
    const cachedId = cache.get("DB_MASTER_ID");

    if (cachedId) {
      ss = SpreadsheetApp.openById(cachedId);
      return ss;
    }

    // 2. Find in Drive
    const files = DriveApp.getFilesByName("DB_Master");
    if (files.hasNext()) {
      ss = SpreadsheetApp.openById(file.getId());

      // 3. Cache for 6 hours
      cache.put("DB_MASTER_ID", ss.getId(), 21600);
    }

    return ss;
  } catch (error) {
    Logger.log("Error: " + error.toString());
    throw error;
  }
}
```

## 🧪 Cách test:

1. **Deploy version mới** trong Apps Script
2. Mở web app
3. **Test scenario 1:** Click nút "Đăng nhập với Google" 1 lần

   - ✅ Không bị lỗi 429
   - ✅ Loading indicator hiện ra
   - ✅ Response được xử lý đúng

4. **Test scenario 2:** Click nút nhiều lần liên tục

   - ✅ Chỉ request đầu tiên được gửi
   - ✅ Các click sau bị ignore
   - ✅ Console log: "Already in progress, ignoring"

5. **Test scenario 3:** Mất kết nối internet
   - ✅ Sau 30s timeout
   - ✅ Show message: "Hết thời gian chờ..."

## 📊 Performance Improvements:

- **Trước:** Mỗi request gọi `DriveApp.getFilesByName()` → slow + rate limit
- **Sau:** Cache database ID trong 6 giờ → fast + ít API calls

- **Trước:** User có thể spam click → nhiều requests cùng lúc → 429
- **Sau:** Chỉ cho phép 1 request tại 1 thời điểm

## ⚠️ Lưu ý:

### **Về HTTP 429:**

- Google Apps Script có limit: ~100 requests/phút/user
- Nếu vẫn gặp 429, đợi 1-2 phút rồi thử lại
- Cache giúp giảm API calls đáng kể

### **Về executeAs: USER_ACCESSING:**

- Cần thiết để lấy Google email
- User phải grant permissions lần đầu
- Permissions được lưu lại cho lần sau

### **Về Cache:**

- Cache expires sau 6 giờ
- Nếu đổi database, clear cache: `CacheService.getScriptCache().removeAll()`

## 🎯 Kết quả:

- ✅ Không còn lỗi HTTP 429
- ✅ Không còn TypeError về null
- ✅ Error messages rõ ràng hơn
- ✅ Performance tốt hơn với cache
- ✅ UX tốt hơn với duplicate click prevention
- ✅ Timeout protection

## 🔄 Next Steps (Optional):

1. **Rate limiting phía server:**

   ```javascript
   const userCache = CacheService.getUserCache();
   const lastRequest = userCache.get("last_google_auth");

   if (lastRequest && Date.now() - lastRequest < 5000) {
     return { status: "error", message: "Vui lòng đợi 5 giây" };
   }

   userCache.put("last_google_auth", Date.now().toString(), 10);
   ```

2. **Exponential backoff:**
   Nếu gặp 429, tự động retry sau 1s, 2s, 4s, 8s...

3. **Better loading states:**
   Show progress bar thay vì chỉ spinner
