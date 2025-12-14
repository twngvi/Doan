/**
 * auth/googleAuth.js
 * Xử lý luồng xác thực OAuth 2.0 với Google
 */

const GOOGLE_AUTH_CONFIG = {
  CLIENT_ID: '781599898111-ookle9f5ejrr545k5hpcoshjv86rk5pr.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REDIRECT_URI: ScriptApp.getService().getUrl(), // Tự động lấy URL hiện tại
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  USER_INFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo'
};

function getGoogleAuthUrl() {
  const params = {
    client_id: GOOGLE_AUTH_CONFIG.CLIENT_ID,
    redirect_uri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'online',
    state: 'google_login_flow',
    prompt: 'select_account'
  };
  
  const queryString = Object.keys(params)
    .map(key => key + '=' + encodeURIComponent(params[key]))
    .join('&');
    
  return GOOGLE_AUTH_CONFIG.AUTH_URL + '?' + queryString;
}

function handleGoogleCallback(authCode) {
  try {
    // 1. Đổi Code lấy Access Token
    const payload = {
      code: authCode,
      client_id: GOOGLE_AUTH_CONFIG.CLIENT_ID,
      client_secret: GOOGLE_AUTH_CONFIG.CLIENT_SECRET,
      redirect_uri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
      grant_type: 'authorization_code'
    };

    const tokenResponse = UrlFetchApp.fetch(GOOGLE_AUTH_CONFIG.TOKEN_URL, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    
    const tokenData = JSON.parse(tokenResponse.getContentText());
    if (!tokenData.access_token) throw new Error("Failed to get access token");

    // 2. Lấy thông tin User
    const userResponse = UrlFetchApp.fetch(GOOGLE_AUTH_CONFIG.USER_INFO_URL, {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const googleUser = JSON.parse(userResponse.getContentText());
    
    // 3. Xử lý Logic Database (Tạo user + Tạo Sheet cá nhân)
    const appUser = processGoogleUserLogin(googleUser);

    // 4. Trả về HTML với nút bấm chuyển hướng (Fix lỗi SecurityError)
    const dashboardUrl = ScriptApp.getService().getUrl() + "?page=dashboard";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đăng nhập thành công</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f3f4f6; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px; width: 90%; }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
          h2 { color: #111827; margin-bottom: 0.5rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          .btn { display: inline-block; background-color: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: background-color 0.2s; }
          .btn:hover { background-color: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🎉</div>
          <h2>Đăng nhập thành công!</h2>
          <p>Xin chào <strong>${appUser.displayName}</strong>. Tài khoản và dữ liệu học tập của bạn đã sẵn sàng.</p>
          
          <a href="${dashboardUrl}" target="_top" class="btn" id="redirectBtn">
            Vào Dashboard ngay
          </a>

          <script>
            // Lưu session vào localStorage
            const user = ${JSON.stringify(appUser)};
            localStorage.setItem("currentUser", JSON.stringify(user));
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userId", user.userId);
            
            // Tự động click sau 1s (nếu trình duyệt cho phép)
            setTimeout(() => {
              document.getElementById('redirectBtn').click();
            }, 1000);
          </script>
        </div>
      </body>
      </html>
    `;
    return HtmlService.createHtmlOutput(htmlContent);

  } catch (e) {
    Logger.log("OAuth Error: " + e.toString());
    return HtmlService.createHtmlOutput("Login Failed: " + e.toString());
  }
}
