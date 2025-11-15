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
 * Handle Google Sign-In
 * @return {Object} { status, message, user, userEmail }
 */
function handleGoogleAuth() {
  try {
    Logger.log("=== GOOGLE AUTH ===");

    // Get user's email from Google account
    // Note: This only works when webapp executeAs is set to "USER_ACCESSING"
    let userEmail = Session.getActiveUser().getEmail();

    // Fallback: Try effective user (when executeAs is USER_ACCESSING)
    if (!userEmail) {
      userEmail = Session.getEffectiveUser().getEmail();
    }

    if (!userEmail) {
      Logger.log("Failed to get user email. Check webapp executeAs setting.");
      return {
        status: "error",
        message:
          "Could not get Google account email. Please ensure the web app is configured with executeAs: USER_ACCESSING and you have granted permissions.",
      };
    }

    Logger.log("Google email: " + userEmail);

    // Get database
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return {
        status: "error",
        message: "Users sheet not found. Please initialize database first.",
      };
    }

    // Check if user with this email already exists
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === userEmail) {
        // email in column C
        // User exists - return as login
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

        // Log activity
        logActivity({
          userId: user.userId,
          action: "Google Login",
          details: "User logged in with Google account",
        });

        Logger.log("Existing user logged in via Google: " + user.username);

        return {
          status: "success",
          message: "Logged in successfully with Google",
          user: user,
          userEmail: userEmail,
          isNewUser: false,
        };
      }
    }

    // User doesn't exist - create new account
    const userId = generateNextId(usersSheet, "USR");

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

    // Create progress sheet for new user
    createUserProgressSheet(userId, fullName);

    // Log activity
    logActivity({
      userId: userId,
      action: "Google Signup",
      details: "New user registered with Google account: " + email,
    });

    Logger.log("New user registered via Google: " + username);

    return {
      status: "success",
      message: "Account created successfully with Google",
      user: newUser,
      userEmail: userEmail,
      isNewUser: true,
    };
  } catch (error) {
    Logger.log("Error in Google auth: " + error.toString());
    return {
      status: "error",
      message: "Failed to authenticate with Google: " + error.toString(),
    };
  }
}
