/**
 * authHelper.js
 * 
 * Helper functions to replace Session.getActiveUser().getEmail() 
 * with a token-based authentication check.
 */

/**
 * Retrieves the email from the provided authContext and verifies the session token.
 * Falls back to Session.getActiveUser().getEmail() if no context is provided or validation fails.
 * 
 * @param {object} authContext - { email: "...", sessionId: "..." } provided by the client
 * @returns {string} The verified email address, or empty string if not authenticated.
 */
function getVerifiedEmail(authContext) {
  try {
    // 1. Try to use the client-provided authContext
    if (authContext && authContext.email && authContext.sessionId) {
      // Validate session token against the database
      // The function checkSession is defined in auth/login.js
      if (typeof checkSession === 'function') {
        const userId = getUserIdByEmail(authContext.email);
        if (userId) {
          const sessionStatus = checkSession(userId, authContext.sessionId);
          if (sessionStatus && sessionStatus.status === 'valid') {
            return authContext.email;
          } else {
            Logger.log("Custom Auth Failed: Invalid session token for " + authContext.email);
          }
        }
      }
    }
    
    // 2. Fallback to Google's built-in function (for Execute as: User, or same domain)
    const googleEmail = Session.getActiveUser().getEmail();
    if (googleEmail) {
      return googleEmail;
    }
    
    // 3. Not authenticated
    return "";
  } catch (e) {
    Logger.log("Error in getVerifiedEmail: " + e.toString());
    return Session.getActiveUser().getEmail() || "";
  }
}

