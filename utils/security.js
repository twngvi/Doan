/**
 * security.js - Security & Validation Utilities
 *
 * Chứa các hàm bảo mật: hash password, validate email, generate token
 */

/**
 * Hash password using SHA-256 with salt
 * ⭐ Security: Thêm salt để chống rainbow table attack
 */
var PASSWORD_SALT = "O.Uiz_2024_s3cur1ty_s@lt";

function hashPassword(password) {
  try {
    // ⭐ Thêm salt trước khi hash
    var saltedPassword = PASSWORD_SALT + password;
    
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      saltedPassword,
      Utilities.Charset.UTF_8
    );

    return hash
      .map(function (byte) {
        const v = byte < 0 ? 256 + byte : byte;
        return ("0" + v.toString(16)).slice(-2);
      })
      .join("");
  } catch (error) {
    Logger.log("Error hashing password: " + error.toString());
    // ⭐ KHÔNG trả về plain password - throw error thay vì leak password
    throw new Error("Password hashing failed: " + error.toString());
  }
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hash) {
  try {
    const inputHash = hashPassword(password);
    return inputHash === hash;
  } catch (error) {
    Logger.log("Error verifying password: " + error.toString());
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random string
 */
function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate verification token (6-digit code)
 */
function generateVerificationToken() {
  // Generate 6-digit random code
  return Math.floor(100000 + Math.random() * 900000).toString();
}
