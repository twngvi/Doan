/**
 * main.gs - Entry Point for Web App
 *
 * Handles all HTTP requests and serves the SPA
 */

/**
 * Handle GET requests - Serve the web application
 * @param {Object} e - Event parameter
 * @return {HtmlOutput} The HTML page
 */
function doGet(e) {
  try {
    Logger.log("=== doGet called ===");
    Logger.log("Parameters: " + JSON.stringify(e.parameter));
    
    // Create HTML template from index.html
    const template = HtmlService.createTemplateFromFile("views/index");
    
    // Pass URL parameters to template
    template.params = e.parameter || {};
    
    // Evaluate the template (processes <?!= ... ?> tags)
    const htmlOutput = template
      .evaluate()
      .setTitle("Doanv3 - Learning Management System")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1");

    return htmlOutput;
  } catch (error) {
    Logger.log("Error in doGet: " + error.toString());
    return HtmlService.createHtmlOutput(
      "<h1>Error loading application</h1><p>" + error.toString() + "</p>"
    );
  }
}

/**
 * Include helper function to embed HTML files
 * Used in templates with <?!= include('filename'); ?>
 * @param {string} filename - Name of the file to include (without .html)
 * @return {string} Content of the file
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log("Error including file " + filename + ": " + error.toString());
    return "<!-- Error loading " + filename + " -->";
  }
}

/**
 * Get user session info (for client-side validation)
 * @param {string} userId - User ID to validate
 * @return {Object} User session data
 */
function getUserSession(userId) {
  try {
    if (!userId) {
      return { status: "error", message: "User ID required" };
    }

    // Get user data from Users sheet
    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");
    const data = usersSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // userId in column A
        return {
          status: "success",
          user: {
            userId: data[i][0],
            username: data[i][1],
            email: data[i][2],
            fullName: data[i][4],
            role: data[i][5],
            lastLogin: data[i][7],
            isActive: data[i][8],
          },
        };
      }
    }

    return { status: "error", message: "User not found" };
  } catch (error) {
    Logger.log("Error in getUserSession: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}
