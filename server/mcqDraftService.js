/**
 * MCQ Draft Service - (Disabled cross-device draft syncing)
 * All endpoints now return immediate success without modifying or checking Google Sheets
 * to ensure backward compatibility for any old browser clients.
 */

function saveMCQDraftToServer(payload) {
  return {
    success: true,
    ignored: true,
    message: "Đã vô hiệu hóa tính năng đồng bộ nháp giữa 2 thiết bị."
  };
}

function getMCQDraftFromServer(payload) {
  return {
    success: true,
    draft: null,
    status: "none",
    message: "Đã vô hiệu hóa tính năng đồng bộ nháp giữa 2 thiết bị."
  };
}

function getMCQDraftStatusFromServer(payload) {
  return {
    success: true,
    exists: false,
    found: false,
    status: "none",
    draft: null,
    message: "Đã vô hiệu hóa tính năng đồng bộ nháp giữa 2 thiết bị."
  };
}

function deleteMCQDraftFromServer(payload) {
  return {
    success: true,
    completed: true,
    deleted: 0,
    status: "completed",
    message: "Đã vô hiệu hóa tính năng đồng bộ nháp giữa 2 thiết bị."
  };
}

function cleanupOldMCQDraftTombstonesForUser(email, keepDays) {
  return {
    success: true,
    deleted: 0
  };
}

function cleanupOldMCQDraftTombstonesForCurrentUser(emailOrPayload) {
  return {
    success: true,
    deleted: 0
  };
}
