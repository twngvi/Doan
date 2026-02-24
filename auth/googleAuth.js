/**
 * auth/googleAuth.js
 * Xử lý luồng xác thực OAuth 2.0 với Google
 */

const GOOGLE_AUTH_CONFIG = {
  CLIENT_ID:
    "781599898111-ookle9f5ejrr545k5hpcoshjv86rk5pr.apps.googleusercontent.com",
  CLIENT_SECRET: "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",
  REDIRECT_URI: ScriptApp.getService().getUrl(), // Tự động lấy URL hiện tại
  AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN_URL: "https://oauth2.googleapis.com/token",
  USER_INFO_URL: "https://www.googleapis.com/oauth2/v2/userinfo",
};

function getGoogleAuthUrl() {
  const params = {
    client_id: GOOGLE_AUTH_CONFIG.CLIENT_ID,
    redirect_uri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
    response_type: "code",
    scope: "email profile",
    access_type: "online",
    state: "google_login_flow",
    prompt: "select_account",
  };

  const queryString = Object.keys(params)
    .map((key) => key + "=" + encodeURIComponent(params[key]))
    .join("&");

  return GOOGLE_AUTH_CONFIG.AUTH_URL + "?" + queryString;
}

function handleGoogleCallback(authCode) {
  try {
    // 1. Đổi Code lấy Access Token
    const payload = {
      code: authCode,
      client_id: GOOGLE_AUTH_CONFIG.CLIENT_ID,
      client_secret: GOOGLE_AUTH_CONFIG.CLIENT_SECRET,
      redirect_uri: GOOGLE_AUTH_CONFIG.REDIRECT_URI,
      grant_type: "authorization_code",
    };

    const tokenResponse = UrlFetchApp.fetch(GOOGLE_AUTH_CONFIG.TOKEN_URL, {
      method: "post",
      payload: payload,
      muteHttpExceptions: true,
    });

    const tokenData = JSON.parse(tokenResponse.getContentText());
    if (!tokenData.access_token) throw new Error("Failed to get access token");

    // 2. Lấy thông tin User
    const userResponse = UrlFetchApp.fetch(GOOGLE_AUTH_CONFIG.USER_INFO_URL, {
      headers: { Authorization: "Bearer " + tokenData.access_token },
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
        <title>Đăng nhập thành công - O.Uiz</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fredoka+One&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0b1220 0%, #0b2a6f 45%, #2563eb 100%);
            position: relative;
            overflow: hidden;
          }
          
          /* Animated Stars Background */
          .stars {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          
          .star {
            position: absolute;
            width: 3px;
            height: 3px;
            background: white;
            border-radius: 50%;
            animation: twinkle 2s ease-in-out infinite;
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          
          /* Success Card */
          .success-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 3rem 2.5rem;
            text-align: center;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            animation: cardAppear 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
            position: relative;
            z-index: 10;
          }
          
          @keyframes cardAppear {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          
          /* Logo */
          .logo {
            font-family: 'Fredoka One', sans-serif;
            font-size: 2rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 0;
          }
          
          .logo-o { color: #2563eb; }
          .logo-dot { color: #f59e0b; margin: 0 2px; animation: bounce 1s ease infinite; }
          .logo-text { color: #2563eb; }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          
          /* Success Icon */
          .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            animation: iconPop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both;
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);
          }
          
          @keyframes iconPop {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          
          .success-icon svg {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
          
          .checkmark {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: drawCheck 0.5s ease 0.6s forwards;
          }
          
          @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
          }
          
          /* Text */
          h2 {
            color: #0f172a;
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
          }
          
          .welcome-text {
            color: #64748b;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          
          .welcome-text strong {
            color: #2563eb;
            font-weight: 600;
          }
          
          /* Button */
          .btn-dashboard {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
          }
          
          .btn-dashboard:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
          }
          
          .btn-dashboard svg {
            width: 20px;
            height: 20px;
            transition: transform 0.3s ease;
          }
          
          .btn-dashboard:hover svg {
            transform: translateX(4px);
          }
          
          /* Confetti */
          .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 2px;
            animation: confettiFall 3s ease-out forwards;
          }
          
          @keyframes confettiFall {
            0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Stars Background -->
        <div class="stars" id="stars"></div>
        
        <!-- Confetti -->
        <div id="confetti"></div>
        
        <!-- Success Card -->
        <div class="success-card">
          <div class="logo">
            <span class="logo-o">O</span>
            <span class="logo-dot">.</span>
            <span class="logo-text">uiz</span>
          </div>
            
          <h2>Chào mừng trở lại! 🎉</h2>
          <p class="welcome-text">
            Xin chào <strong>${appUser.displayName}</strong>!<br>
            Tài khoản và dữ liệu học tập đã sẵn sàng.
          </p>
          
          <a href="${dashboardUrl}" target="_top" class="btn-dashboard" id="redirectBtn">
            Vào Dashboard
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>

        <script>
          // Create stars
          const starsContainer = document.getElementById('stars');
          for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 2 + 's';
            star.style.width = (Math.random() * 2 + 1) + 'px';
            star.style.height = star.style.width;
            starsContainer.appendChild(star);
          }
          
          // Create confetti
          const confettiContainer = document.getElementById('confetti');
          const colors = ['#f59e0b', '#22c55e', '#2563eb', '#ec4899', '#a3e635'];
          for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confettiContainer.appendChild(confetti);
          }
          
          // Lưu session vào localStorage và sessionStorage
          const user = ${JSON.stringify(appUser)};
          
          try {
            localStorage.setItem("currentUser", JSON.stringify(user));
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userId", user.userId);
            localStorage.setItem("lastActivePage", "dashboard");
            console.log("✅ Session saved to localStorage");
          } catch (e) {
            console.warn("⚠️ localStorage blocked:", e);
          }
          
          try {
            sessionStorage.setItem("currentUser", JSON.stringify(user));
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("userId", user.userId);
            console.log("✅ Session saved to sessionStorage");
          } catch (e) {
            console.warn("⚠️ sessionStorage blocked:", e);
          }
          
          // Set biến global
          if (typeof window !== 'undefined') {
            window.currentUser = user;
          }
          
          console.log("✅ Google login complete for:", user.displayName);
        </script>
      </body>
      </html>
    `;
    return HtmlService.createHtmlOutput(htmlContent);
  } catch (e) {
    Logger.log("OAuth Error: " + e.toString());
    return HtmlService.createHtmlOutput("Login Failed: " + e.toString());
  }
}
