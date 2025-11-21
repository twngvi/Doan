/**
 * users.gs - User Management Functions
 *
 * Handles user registration, login, and authentication
 */

/**
 * Register a new user
 * @param {Object} payload - { username, password, email, fullName }
 * @return {Object} { status, message, user }
 */
function registerUser(payload) {
  try {
    Logger.log("=== REGISTER USER ===");
    Logger.log("Payload: " + JSON.stringify(payload));

    // Validation
    if (!payload.username || !payload.password || !payload.fullName) {
      return {
        status: "error",
        message: "Username, password, and full name are required",
      };
    }

    // Get database
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        status: "error",
        message: "Users sheet not found. Please initialize database first.",
      };
    }

    // Check if username already exists
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === payload.username) {
        // username in column B
        return {
          status: "error",
          message: "Username already exists",
        };
      }
      if (payload.email && data[i][2] === payload.email) {
        // email in column C
        return {
          status: "error",
          message: "Email already exists",
        };
      }
    }

    // Generate new user ID
    const userId = generateNextId(usersSheet, "USR");

    // Hash password
    const passwordHash = hashPassword(payload.password);

    // Create user data
    const timestamp = new Date().toISOString();
    const newUser = [
      userId, // userId
      payload.username, // username
      payload.email || "", // email
      passwordHash, // passwordHash
      payload.fullName, // fullName
      payload.role || "student", // role
      timestamp, // createdAt
      timestamp, // lastLogin
      true, // isActive
    ];

    // Add user to sheet
    usersSheet.appendRow(newUser);

    // Create user progress sheet (copy from template)
    const userSheetId = createUserProgressSheet(userId, payload.fullName);

    // Log activity
    logActivity({
      level: "INFO",
      category: "USER",
      userId: userId,
      action: "REGISTER",
      details: "New user registered: " + payload.username,
    });

    Logger.log("User registered successfully: " + userId);

    return {
      status: "success",
      message: "Registration successful",
      user: {
        userId: userId,
        username: payload.username,
        email: payload.email || "",
        fullName: payload.fullName,
        role: payload.role || "student",
        userSheetId: userSheetId,
      },
    };
  } catch (error) {
    Logger.log("Error in registerUser: " + error.toString());
    return {
      status: "error",
      message: "Registration failed: " + error.toString(),
    };
  }
}

/**
 * Login user
 * @param {Object} payload - { username, password }
 * @return {Object} { status, message, user }
 */
function loginUser(payload) {
  try {
    Logger.log("=== LOGIN USER ===");
    Logger.log("Username: " + payload.username);

    // Validation
    if (!payload.username || !payload.password) {
      return {
        status: "error",
        message: "Username and password are required",
      };
    }

    // Get database
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        status: "error",
        message: "Users sheet not found",
      };
    }

    // Find user
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === payload.username) {
        // username in column B
        // Check if user is active
        if (!data[i][8]) {
          // isActive in column I
          return {
            status: "error",
            message: "Account is inactive. Please contact administrator.",
          };
        }

        // Verify password
        const passwordHash = data[i][3]; // passwordHash in column D
        if (!verifyPassword(payload.password, passwordHash)) {
          return {
            status: "error",
            message: "Invalid password",
          };
        }

        // Update last login
        const timestamp = new Date().toISOString();
        usersSheet.getRange(i + 1, 8).setValue(timestamp); // lastLogin in column H

        // Find or create user progress sheet
        let userSheetId = findUserProgressSheet(data[i][0]);
        if (!userSheetId) {
          Logger.log("User doesn't have personal sheet, creating one...");
          userSheetId = createUserProgressSheet(data[i][0], data[i][4]);
        }

        // Log activity
        logActivity({
          level: "INFO",
          category: "USER",
          userId: data[i][0],
          action: "LOGIN",
          details: "User logged in: " + payload.username,
        });

        Logger.log("Login successful: " + data[i][0]);

        return {
          status: "success",
          message: "Login successful",
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            fullName: data[i][4],
            role: data[i][5],
            createdAt: data[i][6],
            lastLogin: timestamp,
            userSheetId: userSheetId,
          },
        };
      }
    }

    // User not found
    return {
      status: "error",
      message: "Invalid username or password",
    };
  } catch (error) {
    Logger.log("Error in loginUser: " + error.toString());
    return {
      status: "error",
      message: "Login failed: " + error.toString(),
    };
  }
}

/**
 * Create separate Google Sheet for user's learning data
 * @param {string} userId - User ID
 * @param {string} fullName - User's full name
 * @return {string} New spreadsheet ID
 */
function createUserProgressSheet(userId, fullName) {
  try {
    Logger.log("Creating personal sheet for user: " + userId);

    // Check if user already has a sheet
    const existingSheetId = findUserProgressSheet(userId);
    if (existingSheetId) {
      Logger.log("User already has a sheet: " + existingSheetId);
      return existingSheetId;
    }

    // Create new Google Sheet for this user
    const sheetName = fullName + " - Learning Progress (" + userId + ")";
    const newSpreadsheet = SpreadsheetApp.create(sheetName);
    const spreadsheetId = newSpreadsheet.getId();

    Logger.log("Created new spreadsheet: " + spreadsheetId);

    // Get the default sheet
    const sheet = newSpreadsheet.getSheets()[0];
    sheet.setName("My Progress");

    // Set up headers
    const headers = [
      "Date",
      "Topic",
      "Activity Type",
      "Score",
      "Time Spent (min)",
      "Status",
      "Notes",
    ];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);

    // Add welcome message
    sheet.getRange(2, 1).setValue("Welcome!");
    sheet.getRange(2, 2).setValue("Your learning journey starts here");
    sheet.getRange(2, 3).setValue("-");
    sheet.getRange(2, 4).setValue("-");
    sheet.getRange(2, 5).setValue("-");
    sheet.getRange(2, 6).setValue("Ready");
    sheet.getRange(2, 7).setValue("Start learning to see your progress!");

    // Create additional sheets
    const summarySheet = newSpreadsheet.insertSheet("Summary");
    summarySheet.getRange(1, 1).setValue("Learning Summary for " + fullName);
    summarySheet.getRange(1, 1).setFontSize(14).setFontWeight("bold");
    summarySheet.getRange(3, 1).setValue("Total Activities:");
    summarySheet.getRange(4, 1).setValue("Average Score:");
    summarySheet.getRange(5, 1).setValue("Total Time Spent:");
    summarySheet.getRange(6, 1).setValue("Favorite Topic:");

    const achievementsSheet = newSpreadsheet.insertSheet("Achievements");
    achievementsSheet.getRange(1, 1).setValue("🏆 My Achievements");
    achievementsSheet.getRange(1, 1).setFontSize(14).setFontWeight("bold");
    achievementsSheet
      .getRange(3, 1, 1, 3)
      .setValues([["Badge", "Achievement", "Date Earned"]]);
    achievementsSheet
      .getRange(3, 1, 1, 3)
      .setFontWeight("bold")
      .setBackground("#34a853")
      .setFontColor("white");

    // Store spreadsheet ID in DB_Master
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          // Add spreadsheetId to column J (index 10)
          usersSheet.getRange(i + 1, 10).setValue(spreadsheetId);
          Logger.log("Saved spreadsheet ID to user record");
          break;
        }
      }
    }

    Logger.log("Successfully created personal sheet for: " + fullName);
    return spreadsheetId;
  } catch (error) {
    Logger.log("Error creating user sheet: " + error.toString());
    return null;
  }
}

/**
 * Find user's personal Google Sheet
 * @param {string} userId - User ID
 * @return {string} Spreadsheet ID or null
 */
function findUserProgressSheet(userId) {
  try {
    // Check in DB_Master first
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (usersSheet) {
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId && data[i][9]) {
          // Column J (index 9) contains spreadsheetId
          Logger.log("Found existing sheet for user: " + data[i][9]);
          return data[i][9];
        }
      }
    }

    // If not found in DB, search Drive by name pattern
    const files = DriveApp.searchFiles(
      'title contains "' +
        userId +
        '" and mimeType = "application/vnd.google-apps.spreadsheet"'
    );

    if (files.hasNext()) {
      const file = files.next();
      const spreadsheetId = file.getId();
      Logger.log("Found sheet via Drive search: " + spreadsheetId);
      return spreadsheetId;
    }

    return null;
  } catch (error) {
    Logger.log("Error finding user sheet: " + error.toString());
    return null;
  }
}

/**
 * Ensure user has progress sheet (create if not exists)
 * Called when user first accesses dashboard
 * @param {string} userId - User ID
 * @return {Object} { status, message, spreadsheetId }
 */
function ensureUserProgressSheet(userId) {
  try {
    Logger.log("Ensuring progress sheet for user: " + userId);

    // Get user info
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return { status: "error", message: "Users sheet not found" };
    }

    const data = usersSheet.getDataRange().getValues();
    let userRow = null;
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        userRow = data[i];
        rowIndex = i + 1;
        break;
      }
    }

    if (!userRow) {
      return { status: "error", message: "User not found" };
    }

    const fullName = userRow[4]; // fullName in column E

    // Check if already has spreadsheet ID
    if (userRow[9]) {
      // spreadsheetId in column J
      Logger.log("User already has progress sheet: " + userRow[9]);
      return {
        status: "success",
        message: "Progress sheet already exists",
        spreadsheetId: userRow[9],
      };
    }

    // Create new progress sheet
    Logger.log("Creating new progress sheet...");
    const spreadsheetId = createUserProgressSheet(userId, fullName);

    if (spreadsheetId) {
      // Update user record with spreadsheet ID
      usersSheet.getRange(rowIndex, 10).setValue(spreadsheetId);

      return {
        status: "success",
        message: "Progress sheet created successfully",
        spreadsheetId: spreadsheetId,
      };
    } else {
      return {
        status: "error",
        message: "Failed to create progress sheet",
      };
    }
  } catch (error) {
    Logger.log("Error ensuring progress sheet: " + error.toString());
    return {
      status: "error",
      message: "Error: " + error.toString(),
    };
  }
}

/**
 * Handle Google Sign-In with OAuth token
 * @param {string} idToken - Google ID token from client
 * @return {Object} { status, message, user, userEmail }
 */
function handleGoogleAuthWithToken(idToken) {
  try {
    Logger.log("=== GOOGLE AUTH WITH TOKEN START ===");

    if (!idToken) {
      return {
        status: "error",
        message: "No ID token provided",
      };
    }

    // Verify and decode the token
    // Note: In production, you should verify the token signature
    const payload = decodeJWT(idToken);

    if (!payload || !payload.email) {
      return {
        status: "error",
        message: "Invalid token or no email in token",
      };
    }

    const userEmail = payload.email;
    const fullName = payload.name || userEmail.split("@")[0];

    Logger.log("Google email from token: " + userEmail);
    Logger.log("Full name: " + fullName);

    // Get database
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        status: "error",
        message: "Users sheet not found",
      };
    }

    // Check if user exists
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === userEmail) {
        // User exists
        const user = {
          userId: data[i][0],
          username: data[i][1],
          email: data[i][2],
          fullName: data[i][4],
          role: data[i][5],
          createdAt: data[i][6],
          lastLogin: new Date(),
        };

        // Update last login
        usersSheet.getRange(i + 1, 8).setValue(formatDate(new Date()));

        Logger.log("Existing user logged in: " + user.username);

        return {
          status: "success",
          message: "Logged in successfully with Google",
          user: user,
          userEmail: userEmail,
          isNewUser: false,
        };
      }
    }

    // Create new user
    const userId = generateNextId(usersSheet, "USR");
    const username = userEmail.split("@")[0];
    const timestamp = formatDate(new Date());

    const newUser = {
      userId: userId,
      username: username,
      email: userEmail,
      passwordHash: "GOOGLE_AUTH",
      fullName: fullName,
      role: "student",
      createdAt: timestamp,
      lastLogin: timestamp,
      isActive: true,
    };

    usersSheet.appendRow([
      newUser.userId,
      newUser.username,
      newUser.email,
      newUser.passwordHash,
      newUser.fullName,
      newUser.role,
      newUser.createdAt,
      newUser.lastLogin,
      newUser.isActive,
    ]);

    // Create progress sheet (async, don't wait)
    try {
      createUserProgressSheet(userId, fullName);
    } catch (e) {
      Logger.log("Progress sheet creation failed: " + e.toString());
    }

    Logger.log("New user created: " + username);

    return {
      status: "success",
      message: "Account created successfully with Google",
      user: newUser,
      userEmail: userEmail,
      isNewUser: true,
    };
  } catch (error) {
    Logger.log("Error in Google auth with token: " + error.toString());
    return {
      status: "error",
      message: "Failed to authenticate: " + error.toString(),
    };
  }
}

/**
 * Simple JWT decoder (for Google ID token)
 */
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = Utilities.newBlob(
      Utilities.base64Decode(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ).getDataAsString();

    return JSON.parse(decoded);
  } catch (e) {
    Logger.log("JWT decode error: " + e.toString());
    return null;
  }
}

/**
 * Handle Google Sign-In
 * @return {Object} { status, message, user, userEmail }
 */
function handleGoogleAuth() {
  // CRITICAL: Wrap everything in try-catch to ensure we ALWAYS return something
  try {
    Logger.log("=== GOOGLE AUTH START ===");
    Logger.log("Step 1: Function called");

    // Add a small delay to prevent rate limiting
    try {
      Utilities.sleep(500);
      Logger.log("Step 2: Sleep completed");
    } catch (sleepError) {
      Logger.log("Sleep error (non-critical): " + sleepError.toString());
    }

    // Get user's email from Google account
    Logger.log("Step 3: Getting user email...");
    let userEmail = null;

    try {
      userEmail = Session.getActiveUser().getEmail();
      Logger.log("Step 3a: getActiveUser email: " + userEmail);
    } catch (emailError) {
      Logger.log("Step 3a error: " + emailError.toString());
    }

    // Fallback: Try effective user
    if (!userEmail) {
      try {
        userEmail = Session.getEffectiveUser().getEmail();
        Logger.log("Step 3b: getEffectiveUser email: " + userEmail);
      } catch (emailError) {
        Logger.log("Step 3b error: " + emailError.toString());
      }
    }

    if (!userEmail) {
      Logger.log("Step 3 FAILED: No email found");
      return {
        status: "error",
        message:
          "Could not get Google account email. Please check webapp executeAs setting.",
      };
    }

    Logger.log("Step 4: Email found: " + userEmail);

    Logger.log("Step 4: Email found: " + userEmail);

    // Get database
    Logger.log("Step 5: Getting database...");
    let ss = null;

    try {
      ss = getOrCreateDatabase();
      Logger.log("Step 5a: Database retrieved");
    } catch (dbError) {
      Logger.log("Step 5 ERROR: " + dbError.toString());
      return {
        status: "error",
        message: "Database error: " + dbError.toString(),
      };
    }

    if (!ss) {
      Logger.log("Step 5 FAILED: ss is null");
      return {
        status: "error",
        message: "Database spreadsheet could not be created or accessed.",
      };
    }

    Logger.log("Step 6: Database ID: " + ss.getId());

    let usersSheet = null;
    try {
      usersSheet = ss.getSheetByName("Users");
      Logger.log("Step 6a: Got Users sheet");
    } catch (sheetError) {
      Logger.log("Step 6 ERROR: " + sheetError.toString());
      return {
        status: "error",
        message: "Error accessing Users sheet: " + sheetError.toString(),
      };
    }

    if (!usersSheet) {
      Logger.log("Step 6 FAILED: Users sheet not found");
      return {
        status: "error",
        message: "Users sheet not found. Please initialize database first.",
      };
    }

    Logger.log("Step 7: Users sheet found successfully");

    Logger.log("Step 7: Users sheet found successfully");

    // Check if user with this email already exists
    Logger.log("Step 8: Checking for existing user...");
    let data = [];

    try {
      data = usersSheet.getDataRange().getValues();
      Logger.log("Step 8a: Got " + data.length + " rows");
    } catch (dataError) {
      Logger.log("Step 8 ERROR: " + dataError.toString());
      return {
        status: "error",
        message: "Error reading user data: " + dataError.toString(),
      };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === userEmail) {
        // email in column C
        // User exists - return as login
        Logger.log("Step 9: Found existing user at row " + i);

        const user = {
          userId: data[i][0],
          username: data[i][1],
          email: data[i][2],
          fullName: data[i][4],
          role: data[i][5],
          createdAt: data[i][6],
          lastLogin: new Date(),
        };

        // Update last login (quick operation)
        try {
          usersSheet.getRange(i + 1, 8).setValue(formatDate(new Date()));
          Logger.log("Step 9a: Updated last login");
        } catch (updateError) {
          Logger.log("Step 9a WARNING: " + updateError.toString());
        }

        // Don't log activity - too slow
        Logger.log("Step 10: Skipping activity log to avoid timeout");
        Logger.log("Step 11: Returning success response for existing user");

        return {
          status: "success",
          message: "Logged in successfully with Google",
          user: user,
          userEmail: userEmail,
          isNewUser: false,
        };
      }
    }

    Logger.log("Step 9: No existing user found, creating new one...");

    Logger.log("Step 9: No existing user found, creating new one...");

    // User doesn't exist - create new account
    const userId = generateNextId(usersSheet, "USR");
    Logger.log("Step 10: Generated userId: " + userId);

    // Extract username from email (part before @)
    const username = userEmail.split("@")[0];

    // Get user's full name from Google account if available
    const fullName = userEmail.split("@")[0]; // Fallback to email username

    const timestamp = formatDate(new Date());

    // Create new user row
    const newUser = {
      userId: userId,
      username: username,
      email: userEmail,
      passwordHash: "GOOGLE_AUTH", // No password for Google auth
      fullName: fullName,
      role: "student",
      createdAt: timestamp,
      lastLogin: timestamp,
      isActive: true,
    };

    // Append to Users sheet
    Logger.log("Step 9: Appending new user to sheet...");
    try {
      usersSheet.appendRow([
        newUser.userId,
        newUser.username,
        newUser.email,
        newUser.passwordHash,
        newUser.fullName,
        newUser.role,
        newUser.createdAt,
        newUser.lastLogin,
        newUser.isActive,
      ]);
      Logger.log("Step 9a: User appended successfully");
    } catch (appendError) {
      Logger.log("Step 9 ERROR: " + appendError.toString());
      return {
        status: "error",
        message: "Error creating user: " + appendError.toString(),
      };
    }

    // DON'T create progress sheet here - it takes too long and causes timeout
    // Progress sheet will be created on first login to dashboard
    Logger.log("Step 10: Skipping progress sheet creation to avoid timeout");

    // DON'T log activity - it's slow and not critical
    Logger.log("Step 11: Skipping activity log to avoid timeout");

    Logger.log("Step 12: Returning success response NOW");
    Logger.log("New user registered via Google: " + username);

    // RETURN IMMEDIATELY - don't do any more operations
    const successResponse = {
      status: "success",
      message: "Account created successfully with Google",
      user: newUser,
      userEmail: userEmail,
      isNewUser: true,
    };

    Logger.log("Step 13: Response object created, returning...");
    return successResponse;
  } catch (error) {
    // CRITICAL: Always return an error object, never throw or return nothing
    const errorMsg =
      error && error.toString ? error.toString() : "Unknown error";
    Logger.log("=== GOOGLE AUTH ERROR ===");
    Logger.log("Error: " + errorMsg);
    Logger.log("Stack: " + (error && error.stack ? error.stack : "No stack"));

    return {
      status: "error",
      message: "Failed to authenticate with Google: " + errorMsg,
      error: errorMsg,
    };
  }

  // CRITICAL: This should never be reached, but just in case
  Logger.log("=== GOOGLE AUTH UNEXPECTED END ===");
  return {
    status: "error",
    message: "Unexpected end of function",
  };
}
