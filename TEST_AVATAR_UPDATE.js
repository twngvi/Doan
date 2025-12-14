/**
 * TEST_AVATAR_UPDATE.js
 * Test functions for avatar update feature
 * Run these in Apps Script Editor
 */

/**
 * Test 1: Save avatar URL to database
 */
function testSaveAvatarUrl() {
  Logger.log("=== TEST SAVE AVATAR URL ===");

  // Replace with real userId from your Users sheet
  const testUserId = "USR_1733000000000"; // ⚠️ CHANGE THIS
  const testAvatarUrl = "https://api.dicebear.com/9.x/bottts/svg?seed=TestUser";

  Logger.log("Testing with:");
  Logger.log("- User ID: " + testUserId);
  Logger.log("- Avatar URL: " + testAvatarUrl);

  const result = saveUserAvatarUrl(testUserId, testAvatarUrl);

  Logger.log("Result:");
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log("✅ TEST PASSED: Avatar saved successfully");
  } else {
    Logger.log("❌ TEST FAILED: " + result.message);
  }

  return result;
}

/**
 * Test 2: Verify avatar is stored in database
 */
function testVerifyAvatarInDatabase() {
  Logger.log("=== TEST VERIFY AVATAR IN DATABASE ===");

  const testUserId = "USR_1733000000000"; // ⚠️ CHANGE THIS

  const usersSheet = getSheet("Users");
  if (!usersSheet) {
    Logger.log("❌ Users sheet not found");
    return;
  }

  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];
  const avatarUrlIndex = headers.indexOf("avatarUrl");

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === testUserId) {
      const storedAvatar = data[i][avatarUrlIndex];
      Logger.log("✅ Found user:");
      Logger.log("- User ID: " + data[i][0]);
      Logger.log("- Email: " + data[i][2]);
      Logger.log("- Display Name: " + data[i][3]);
      Logger.log("- Avatar URL: " + storedAvatar);

      if (storedAvatar && storedAvatar !== "") {
        Logger.log("✅ TEST PASSED: Avatar is stored in database");
      } else {
        Logger.log("⚠️ Avatar is empty in database");
      }

      return {
        userId: data[i][0],
        email: data[i][2],
        displayName: data[i][3],
        avatarUrl: storedAvatar,
      };
    }
  }

  Logger.log("❌ User not found with ID: " + testUserId);
}

/**
 * Test 3: List all users with avatars
 */
function testListUsersWithAvatars() {
  Logger.log("=== TEST LIST USERS WITH AVATARS ===");

  const usersSheet = getSheet("Users");
  if (!usersSheet) {
    Logger.log("❌ Users sheet not found");
    return;
  }

  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];
  const avatarUrlIndex = headers.indexOf("avatarUrl");

  Logger.log("Total users: " + (data.length - 1));
  Logger.log("\nUsers with avatars:");

  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const avatar = data[i][avatarUrlIndex];
    if (avatar && avatar !== "") {
      count++;
      Logger.log("\n" + count + ". " + data[i][3] + " (" + data[i][2] + ")");
      Logger.log("   Avatar: " + avatar);
    }
  }

  Logger.log(
    "\n✅ Total users with avatars: " + count + "/" + (data.length - 1)
  );
}

/**
 * Test 4: Simulate full avatar update flow
 */
function testFullAvatarUpdateFlow() {
  Logger.log("=== TEST FULL AVATAR UPDATE FLOW ===");

  const testUserId = "USR_1733000000000"; // ⚠️ CHANGE THIS
  const newAvatar = "https://api.dicebear.com/9.x/shapes/svg?seed=NewTest";

  Logger.log("Step 1: Get current user data");
  const usersBefore = testVerifyAvatarInDatabase();
  if (!usersBefore) {
    Logger.log("❌ User not found");
    return;
  }
  Logger.log("Current avatar: " + usersBefore.avatarUrl);

  Logger.log("\nStep 2: Save new avatar URL");
  const saveResult = saveUserAvatarUrl(testUserId, newAvatar);
  Logger.log("Save result: " + JSON.stringify(saveResult, null, 2));

  if (!saveResult.success) {
    Logger.log("❌ Failed to save avatar");
    return;
  }

  Logger.log("\nStep 3: Verify avatar was updated");
  Utilities.sleep(1000); // Wait 1 second
  const usersAfter = testVerifyAvatarInDatabase();

  Logger.log("\nComparison:");
  Logger.log("- Before: " + usersBefore.avatarUrl);
  Logger.log("- After:  " + usersAfter.avatarUrl);

  if (usersAfter.avatarUrl === newAvatar) {
    Logger.log("\n✅ TEST PASSED: Avatar updated successfully!");
  } else {
    Logger.log("\n❌ TEST FAILED: Avatar not updated");
  }
}

/**
 * Test 5: Get first user ID for testing
 */
function getFirstUserIdForTesting() {
  const usersSheet = getSheet("Users");
  if (!usersSheet) {
    Logger.log("❌ Users sheet not found");
    return;
  }

  const data = usersSheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log("❌ No users in database");
    return;
  }

  Logger.log("First user in database:");
  Logger.log("- User ID: " + data[1][0]);
  Logger.log("- Email: " + data[1][2]);
  Logger.log("- Display Name: " + data[1][3]);
  Logger.log("\n⭐ Use this User ID for testing:");
  Logger.log('const testUserId = "' + data[1][0] + '";');

  return data[1][0];
}

/**
 * Run all tests
 */
function runAllAvatarTests() {
  Logger.log("\n\n");
  Logger.log("╔═══════════════════════════════════════════╗");
  Logger.log("║   AVATAR UPDATE TEST SUITE               ║");
  Logger.log("╚═══════════════════════════════════════════╝");
  Logger.log("\n");

  Logger.log("▶ Getting test user ID...");
  const testUserId = getFirstUserIdForTesting();

  if (!testUserId) {
    Logger.log("❌ No users found in database. Please create a user first.");
    return;
  }

  Logger.log("\n▶ Test 1: List all users with avatars");
  testListUsersWithAvatars();

  Logger.log("\n\n▶ Test 2: Verify avatar in database");
  testVerifyAvatarInDatabase();

  Logger.log("\n\n▶ Test 3: Full avatar update flow");
  testFullAvatarUpdateFlow();

  Logger.log("\n");
  Logger.log("╔═══════════════════════════════════════════╗");
  Logger.log("║   TESTS COMPLETED                        ║");
  Logger.log("╚═══════════════════════════════════════════╝");
}
