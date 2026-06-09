/**
 * chat.js - Server backend cho tính năng Chat và Kết bạn
 * Chứa logic xử lý tìm kiếm bạn bè, gửi lời mời, chat
 */

/**
 * Lấy index các cột của sheet
 */
function getSheetColumnMap(sheetData) {
  const headers = sheetData[0] || [];
  const map = {};
  headers.forEach((h, i) => {
    map[String(h || "").trim()] = i;
  });
  return map;
}

/**
 * Lấy trạng thái quan hệ giữa currentUserId và các users khác
 * Trả về một Map với key là userId, value là status ('friends', 'request_sent', 'request_received')
 */
function getRelationshipsMap(currentUserId) {
  const relMap = {};
  try {
    const ss = getOrCreateDatabase();

    // 1. Kiểm tra bảng Friends
    const friendsSheet = ss.getSheetByName("Friends");
    if (friendsSheet) {
      const fData = friendsSheet.getDataRange().getValues();
      const fCols = getSheetColumnMap(fData);
      
      for (let i = 1; i < fData.length; i++) {
        const row = fData[i];
        const u1 = row[fCols["userId1"]];
        const u2 = row[fCols["userId2"]];
        const status = row[fCols["status"]];
        
        if (status === "active") {
          if (u1 === currentUserId) relMap[u2] = "friends";
          if (u2 === currentUserId) relMap[u1] = "friends";
        }
      }
    }

    // 2. Kiểm tra bảng FriendRequests
    const reqSheet = ss.getSheetByName("FriendRequests");
    if (reqSheet) {
      const rData = reqSheet.getDataRange().getValues();
      const rCols = getSheetColumnMap(rData);
      
      for (let i = 1; i < rData.length; i++) {
        const row = rData[i];
        const fromU = row[rCols["fromUserId"]];
        const toU = row[rCols["toUserId"]];
        const status = row[rCols["status"]];
        
        if (status === "pending") {
          if (fromU === currentUserId && !relMap[toU]) {
            relMap[toU] = "request_sent";
          }
          if (toU === currentUserId && !relMap[fromU]) {
            relMap[fromU] = "request_received";
          }
        }
      }
    }
  } catch (error) {
    Logger.log("Lỗi getRelationshipsMap: " + error.toString());
  }
  
  return relMap;
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function isGoodPlayerMatch(keyword, playerId, displayName, username) {
  const kw = normalizeSearchText(keyword);
  if (!kw) return false;

  const cleanKw = kw.replace(/^#/, "");
  const pid = normalizeSearchText(playerId).replace(/^#/, "");
  const name = normalizeSearchText(displayName);
  const uname = normalizeSearchText(username);

  // Exact / prefix match for player ID is always allowed.
  if (pid === cleanKw) return true;
  if (cleanKw.length >= 2 && pid.startsWith(cleanKw)) return true;

  const nameTokens = name ? name.split(" ").filter(Boolean) : [];
  const unameTokens = uname ? uname.split(" ").filter(Boolean) : [];

  const matchesTokenPrefix = function(textTokens) {
    return textTokens.some(function(token) {
      return token.startsWith(cleanKw);
    });
  };

  // Short keywords are treated strictly to avoid noisy matches.
  if (cleanKw.length < 3) {
    if (matchesTokenPrefix(nameTokens)) return true;
    if (uname.startsWith(cleanKw)) return true;
    return false;
  }

  if (name.includes(cleanKw)) return true;
  if (matchesTokenPrefix(nameTokens)) return true;

  // Username is still searchable, but only with tighter matching than a raw substring.
  if (uname.startsWith(cleanKw)) return true;
  if (matchesTokenPrefix(unameTokens)) return true;

  return false;
}

/**
 * Tìm kiếm người chơi theo từ khóa
 * @param {string} currentUserId - ID người dùng hiện tại
 * @param {string} keyword - Từ khóa tìm kiếm
 */
function searchPlayers(currentUserId, keyword) {
  try {
    if (!keyword || String(keyword).trim() === "") {
      return { success: true, results: [] };
    }

    // Build relationships map so we can report relationship status per result
    const relMap = getRelationshipsMap(currentUserId);

    const ss = getOrCreateDatabase();
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      return { success: false, message: "Không tìm thấy sheet Users." };
    }

    const data = usersSheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return { success: true, results: [] };
    }

    const headers = data[0].map(h => String(h || "").trim());

    const userIdCol = headers.indexOf("userId");
    const playerIdCol = headers.indexOf("playerId");
    const displayNameCol = headers.indexOf("displayName");
    const usernameCol = headers.indexOf("username");
    const avatarCol = headers.indexOf("avatarUrl");
    const emailCol = headers.indexOf("email");
    const isActiveCol = headers.indexOf("isActive");

    if (userIdCol < 0) return { success: false, message: "Thiếu cột userId trong Users." };
    if (playerIdCol < 0) return { success: false, message: "Thiếu cột playerId trong Users." };
    if (displayNameCol < 0) return { success: false, message: "Thiếu cột displayName trong Users." };

    const results = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const userId = String(row[userIdCol] || "").trim();
      const playerId = String(row[playerIdCol] || "").trim();
      const displayName = String(row[displayNameCol] || "").trim();
      const username = usernameCol >= 0 ? String(row[usernameCol] || "").trim() : "";
      const avatar = avatarCol >= 0 ? String(row[avatarCol] || "").trim() : "";
      const email = emailCol >= 0 ? String(row[emailCol] || "").trim() : "";

      if (!userId) continue;

      if (isActiveCol >= 0) {
        const activeValue = row[isActiveCol];
        if (activeValue === false || String(activeValue).toLowerCase() === "false") continue;
      }

      if (!isGoodPlayerMatch(keyword, playerId, displayName, username)) continue;

      results.push({
        userId: userId,
        playerId: playerId || "N/A",
        displayName: displayName || "Người dùng",
        username: username,
        avatar: avatar || "https://www.gravatar.com/avatar/?d=mp",
        relationship: userId === currentUserId ? "self" : (relMap[userId] || "none")
      });

      if (results.length >= 20) break;
    }

    return { success: true, results: results };
  } catch (error) {
    Logger.log("Error in searchPlayers: " + error.toString());
    return { success: false, message: "Lỗi tìm kiếm: " + error.toString() };
  }
}

/**
 * Gửi lời mời kết bạn
 * @param {string} fromUserId - ID người gửi
 * @param {string} toUserId - ID người nhận
 */
function sendFriendRequestApi(fromUserId, toUserId) {
  try {
    Logger.log("sendFriendRequestApi called with fromUserId=" + fromUserId + ", toUserId=" + toUserId);
    if (!fromUserId || !toUserId) {
      return { success: false, message: "Thông tin không hợp lệ." };
    }
    
    if (fromUserId === toUserId) {
      return { success: false, message: "Không thể gửi lời mời cho chính mình." };
    }
    
    const ss = getOrCreateDatabase();
    
    // 1. Kiểm tra tồn tại của người nhận (có thể bỏ qua nếu frontend đã truyền đúng, nhưng để chắc chắn ta có thể kiểm tra)
    const usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      return { success: false, message: "Lỗi hệ thống: Không tìm thấy bảng Users" };
    }
    
    const uData = usersSheet.getDataRange().getValues();
    const uCols = getSheetColumnMap(uData);
    let toUserExists = false;
    for (let i = 1; i < uData.length; i++) {
      if (uData[i][uCols["userId"]] === toUserId) {
        toUserExists = true;
        break;
      }
    }
    if (!toUserExists) {
      return { success: false, message: "Người nhận không tồn tại." };
    }

    // 2. Kiểm tra mối quan hệ hiện tại
    const relMap = getRelationshipsMap(fromUserId);
    const currentStatus = relMap[toUserId];
    
    if (currentStatus === "friends") {
      return { success: false, message: "Hai người đã là bạn bè." };
    }
    if (currentStatus === "request_sent") {
      return { success: false, message: "Bạn đã gửi lời mời trước đó." };
    }
    if (currentStatus === "request_received") {
      return { success: false, message: "Người chơi này đã gửi lời mời cho bạn." };
    }
    
    // 3. Tiến hành tạo Request
    const reqSheet = ss.getSheetByName("FriendRequests");
    if (!reqSheet) {
      return { success: false, message: "Lỗi hệ thống: Không tìm thấy bảng FriendRequests" };
    }
    
    // Bug #12 fix: Xóa các request cũ đã rejected giữa 2 người trước khi tạo mới
    const rData = reqSheet.getDataRange().getValues();
    const rColsClean = getSheetColumnMap(rData);
    for (let i = rData.length - 1; i >= 1; i--) {
      const rFrom = rData[i][rColsClean["fromUserId"]];
      const rTo = rData[i][rColsClean["toUserId"]];
      const rStatus = rData[i][rColsClean["status"]];
      if (rStatus === "rejected" && 
          ((rFrom === fromUserId && rTo === toUserId) || (rFrom === toUserId && rTo === fromUserId))) {
        reqSheet.deleteRow(i + 1);
      }
    }
    
    const requestId = generateNextId(reqSheet, "FRQ");
    const now = new Date();
    
    // Cột theo DB_CONFIG: requestId, fromUserId, toUserId, status, createdAt, updatedAt
    const newRow = [
      requestId,
      fromUserId,
      toUserId,
      "pending",
      now,
      now
    ];
    
    reqSheet.appendRow(newRow);
    Logger.log("Friend request appended: requestId=" + requestId + ", from=" + fromUserId + ", to=" + toUserId);
    
    return { success: true, message: "Đã gửi lời mời kết bạn.", requestId: requestId };
  } catch (error) {
    Logger.log("Error in sendFriendRequestApi: " + error.toString());
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}

/**
 * Lấy danh sách lời mời kết bạn đang chờ (Pending)
 */
function getFriendRequestsApi(userId) {
  try {
    Logger.log("getFriendRequestsApi called for userId=" + userId);
    const ss = getOrCreateDatabase();
    const reqSheet = ss.getSheetByName("FriendRequests");
    const usersSheet = ss.getSheetByName("Users");
    
    if (!reqSheet || !usersSheet) {
      return { success: false, message: "Lỗi hệ thống database." };
    }
    
    const rData = reqSheet.getDataRange().getValues();
    const rCols = getSheetColumnMap(rData);
    const uData = usersSheet.getDataRange().getValues();
    const uCols = getSheetColumnMap(uData);
    
    // Map thông tin users by trimmed string userId
    const userMap = {};
    for (let i = 1; i < uData.length; i++) {
      const uidRaw = uData[i][uCols["userId"]];
      const uid = (uidRaw || "").toString().trim();
      if (!uid) continue;
      userMap[uid] = {
        userId: uid,
        playerId: (uData[i][uCols["playerId"]] || "N/A").toString(),
        displayName: (uData[i][uCols["displayName"]] || "Ẩn danh").toString(),
        avatar: (uData[i][uCols["avatarUrl"]] || getGravatarUrl(uData[i][uCols["email"]] || "")).toString()
      };
    }
    
    const requests = [];
    const userIdTrim = (userId || "").toString().trim();
    for (let i = 1; i < rData.length; i++) {
      const row = rData[i];
      const toId = (row[rCols["toUserId"]] || "").toString().trim();
      const status = (row[rCols["status"]] || "").toString().trim();
      if (toId === userIdTrim && status === "pending") {
        const fromUserId = (row[rCols["fromUserId"]] || "").toString().trim();
        let userInfo = userMap[fromUserId];
        if (!userInfo) {
          userInfo = { userId: fromUserId, playerId: "N/A", displayName: "Ẩn danh", avatar: getGravatarUrl("") };
        }

        const createdAtVal = row[rCols["createdAt"]];
        const createdAtStr = createdAtVal ? new Date(createdAtVal).toISOString() : "";

        requests.push({
          requestId: (row[rCols["requestId"]] || "").toString(),
          sender: userInfo,
          createdAt: createdAtStr
        });
      }
    }

    Logger.log("getFriendRequestsApi: found " + requests.length + " pending requests for " + userIdTrim);
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      Logger.log("FRQ_FOUND: requestId=" + r.requestId + ", to=" + userIdTrim + ", from=" + (r.sender && r.sender.userId ? r.sender.userId : "?") + ", createdAt=" + r.createdAt);
    }

    return { success: true, results: requests, _debug: { calledUserId: userIdTrim, totalRows: rData.length - 1 } };
  } catch (error) {
    Logger.log("Error getFriendRequestsApi: " + error.toString());
    return { success: false, message: "Lỗi lấy danh sách lời mời." };
  }
}

/**
 * Chấp nhận hoặc Từ chối lời mời kết bạn
 */
function respondFriendRequestApi(requestId, currentUserId, action) {
  try {
    const ss = getOrCreateDatabase();
    const reqSheet = ss.getSheetByName("FriendRequests");
    if (!reqSheet) return { success: false, message: "Database lỗi." };
    
    const rData = reqSheet.getDataRange().getValues();
    const rCols = getSheetColumnMap(rData);
    
    let targetRowIndex = -1;
    let fromUserId = null;
    
    for (let i = 1; i < rData.length; i++) {
      if (rData[i][rCols["requestId"]] === requestId) {
        if (rData[i][rCols["toUserId"]] !== currentUserId) {
          return { success: false, message: "Bạn không có quyền xử lý lời mời này." };
        }
        if (rData[i][rCols["status"]] !== "pending") {
          return { success: false, message: "Lời mời này đã được xử lý." };
        }
        targetRowIndex = i + 1;
        fromUserId = rData[i][rCols["fromUserId"]];
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      return { success: false, message: "Không tìm thấy lời mời." };
    }
    
    const now = new Date();
    
    if (action === "accept") {
      // Cập nhật trạng thái thành accepted
      reqSheet.getRange(targetRowIndex, rCols["status"] + 1).setValue("accepted");
      reqSheet.getRange(targetRowIndex, rCols["updatedAt"] + 1).setValue(now);
      
      // Tạo bản ghi trong Friends
      const friendsSheet = ss.getSheetByName("Friends");
      if (friendsSheet) {
        const fData = friendsSheet.getDataRange().getValues();
        const fCols = getSheetColumnMap(fData);
        let alreadyFriends = false;
        
        // Kiểm tra tránh trùng (có thể ai đó spam click)
        for(let i = 1; i < fData.length; i++) {
          const u1 = fData[i][fCols["userId1"]];
          const u2 = fData[i][fCols["userId2"]];
          const st = fData[i][fCols["status"]];
          if (st === "active" && ((u1 === currentUserId && u2 === fromUserId) || (u1 === fromUserId && u2 === currentUserId))) {
            alreadyFriends = true;
            break;
          }
        }
        
        if (!alreadyFriends) {
          const friendshipId = generateNextId(friendsSheet, "FRD");
          // Quy tắc: userId1 là chuỗi nhỏ hơn (theo ABC) để tránh trùng ngược
          const u1 = currentUserId < fromUserId ? currentUserId : fromUserId;
          const u2 = currentUserId < fromUserId ? fromUserId : currentUserId;
          
          friendsSheet.appendRow([friendshipId, u1, u2, "active", now, now]);
        }
        
        // If there is an existing conversation that was previously marked removedFor this user, unmark it so it becomes visible again
        try {
          const convSheet = ss.getSheetByName("Conversations");
          if (convSheet) {
            const cData = convSheet.getDataRange().getValues();
            const cCols = getSheetColumnMap(cData);
            if (cCols["removedFor"]) {
              for (let i = 1; i < cData.length; i++) {
                const cu1 = (cData[i][cCols["userId1"]] || "").toString();
                const cu2 = (cData[i][cCols["userId2"]] || "").toString();
                if ((cu1 === currentUserId && cu2 === fromUserId) || (cu1 === fromUserId && cu2 === currentUserId)) {
                  const removedRaw = (cData[i][cCols["removedFor"]] || "").toString();
                  const list = removedRaw ? removedRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const idx = list.indexOf(currentUserId);
                  if (idx !== -1) {
                    list.splice(idx, 1);
                    convSheet.getRange(i + 1, cCols["removedFor"] + 1).setValue(list.join(','));
                  }
                }
              }
            }
          }
        } catch (e) {
          Logger.log('Warning: cannot clear removedFor on accept: ' + e.toString());
        }
      }
      return { success: true, message: "Đã chấp nhận lời mời kết bạn." };
      
    } else if (action === "reject") {
      // Cập nhật trạng thái thành rejected
      reqSheet.getRange(targetRowIndex, rCols["status"] + 1).setValue("rejected");
      reqSheet.getRange(targetRowIndex, rCols["updatedAt"] + 1).setValue(now);
      return { success: true, message: "Đã từ chối lời mời." };
    }
    
    return { success: false, message: "Hành động không hợp lệ." };
    
  } catch (error) {
    Logger.log("Error respondFriendRequestApi: " + error.toString());
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}

/**
 * Lấy danh sách bạn bè
 */
function getFriendsApi(userId) {
  try {
    Logger.log("getFriendsApi called for userId=" + userId);
    const ss = getOrCreateDatabase();
    const friendsSheet = ss.getSheetByName("Friends");
    const usersSheet = ss.getSheetByName("Users");
    
    if (!friendsSheet || !usersSheet) {
      return { success: false, message: "Lỗi hệ thống database." };
    }
    
    const fData = friendsSheet.getDataRange().getValues();
    const fCols = getSheetColumnMap(fData);
    
    // Lấy danh sách ID bạn bè
    const friendIds = [];
    const userIdTrim = (userId || "").toString().trim();
    for (let i = 1; i < fData.length; i++) {
      const status = (fData[i][fCols["status"]] || "").toString().trim();
      if (status === "active") {
        const u1 = (fData[i][fCols["userId1"]] || "").toString().trim();
        const u2 = (fData[i][fCols["userId2"]] || "").toString().trim();
        if (u1 === userIdTrim) friendIds.push(u2);
        else if (u2 === userIdTrim) friendIds.push(u1);
      }
    }

    Logger.log("getFriendsApi: total friend rows=" + (fData.length - 1) + ", matched friendIdsCount=" + friendIds.length);
    
    if (friendIds.length === 0) {
      return { success: true, results: [], _debug: { calledUserId: userIdTrim, totalFriendRows: fData.length - 1 } };
    }
    
    // Lấy thông tin user
    const uData = usersSheet.getDataRange().getValues();
    const uCols = getSheetColumnMap(uData);
    const friends = [];
    
    for (let i = 1; i < uData.length; i++) {
      const uid = (uData[i][uCols["userId"]] || "").toString().trim();
      if (friendIds.indexOf(uid) !== -1) {
          const lastActiveRaw = uData[i][uCols["lastActiveDate"]] || uData[i][uCols["lastLogin"]];
          let lastActiveStr = "";
          if (lastActiveRaw) {
            const d = new Date(lastActiveRaw);
            if (!isNaN(d.getTime())) {
              lastActiveStr = d.toISOString();
            }
          }

          let isOnline = false;
          if (lastActiveStr) {
            const diff = new Date().getTime() - new Date(lastActiveStr).getTime();
            if (diff < 15 * 60 * 1000) {
              isOnline = true;
            }
          }

          friends.push({
            userId: uid,
            playerId: uData[i][uCols["playerId"]] || "N/A",
            displayName: uData[i][uCols["displayName"]] || "Ẩn danh",
            username: uCols["username"] >= 0 ? (uData[i][uCols["username"]] || "") : "",
            avatar: uData[i][uCols["avatarUrl"]] || getGravatarUrl(uData[i][uCols["email"]] || ""),
            isOnline: isOnline,
            lastActive: lastActiveStr,
            unreadCount: 0,
            lastMessage: ""
          });
      }
    }
    
    return { success: true, results: friends, _debug: { calledUserId: userIdTrim, totalFriendRows: fData.length - 1, matchedCount: friends.length } };
  } catch (error) {
    Logger.log("Error getFriendsApi: " + error.toString());
    return { success: false, message: "Lỗi lấy danh sách bạn bè." };
  }
}

/**
 * Hủy kết bạn
 */
function unfriendApi(currentUserId, targetUserId) {
  try {
    const ss = getOrCreateDatabase();
    const friendsSheet = ss.getSheetByName("Friends");
    
    if (!friendsSheet) return { success: false, message: "Lỗi database." };
    
    const fData = friendsSheet.getDataRange().getValues();
    const fCols = getSheetColumnMap(fData);
    
    let targetRow = -1;
    for (let i = 1; i < fData.length; i++) {
      const u1 = fData[i][fCols["userId1"]];
      const u2 = fData[i][fCols["userId2"]];
      const st = fData[i][fCols["status"]];
      
      if (st === "active" && ((u1 === currentUserId && u2 === targetUserId) || (u1 === targetUserId && u2 === currentUserId))) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow !== -1) {
      const now = new Date();
      friendsSheet.getRange(targetRow, fCols["status"] + 1).setValue("removed");
      friendsSheet.getRange(targetRow, fCols["updatedAt"] + 1).setValue(now);
      
      // Bug #3 fix: Xóa/ẩn conversation liên quan khi hủy kết bạn
      try {
        const convSheet = ss.getSheetByName("Conversations");
        if (convSheet) {
          const cData = convSheet.getDataRange().getValues();
          const cCols = getSheetColumnMap(cData);

          // Ensure removedFor column exists in header, add if missing
          let removedForCol = cCols["removedFor"];
          if (typeof removedForCol === 'undefined') {
            const lastCol = cData[0].length;
            convSheet.getRange(1, lastCol + 1).setValue('removedFor');
            // refresh cData and cCols
            const newCData = convSheet.getDataRange().getValues();
            const newCCols = getSheetColumnMap(newCData);
            removedForCol = newCCols["removedFor"];
          }

          // Duyệt từ dưới lên và mark removedFor for this user
          for (let i = cData.length - 1; i >= 1; i--) {
            const cu1 = cData[i][cCols["userId1"]];
            const cu2 = cData[i][cCols["userId2"]];
            if ((cu1 === currentUserId && cu2 === targetUserId) || (cu1 === targetUserId && cu2 === currentUserId)) {
              try {
                const existing = (cData[i][removedForCol] || "").toString();
                const list = existing ? existing.split(',').map(s => s.trim()).filter(Boolean) : [];
                if (list.indexOf(currentUserId) === -1) {
                  list.push(currentUserId);
                  convSheet.getRange(i + 1, removedForCol + 1).setValue(list.join(','));
                }
              } catch (e) {
                Logger.log('Warning: cannot mark removedFor on conv row: ' + e.toString());
              }
            }
          }
        }
      } catch (convError) {
        Logger.log("Warning: Không thể cập nhật conversation khi unfriend: " + convError.toString());
      }
      
      return { success: true, message: "Đã hủy kết bạn." };
    }
    
    return { success: false, message: "Không tìm thấy quan hệ bạn bè hợp lệ." };
  } catch (error) {
    Logger.log("Error unfriendApi: " + error.toString());
    return { success: false, message: "Lỗi xử lý hủy kết bạn." };
  }
}

/**
 * Khởi tạo hoặc lấy ID cuộc trò chuyện (Conversation) 1-1
 */
function openConversationApi(currentUserId, targetUserId) {
  try {
    const ss = getOrCreateDatabase();
    const friendsSheet = ss.getSheetByName("Friends");
    const convSheet = ss.getSheetByName("Conversations");
    const usersSheet = ss.getSheetByName("Users");
    
    if (!friendsSheet || !convSheet || !usersSheet) {
      return { success: false, message: "Lỗi truy cập dữ liệu." };
    }
    
    // 1. Kiểm tra phải bạn bè không
    const fData = friendsSheet.getDataRange().getValues();
    const fCols = getSheetColumnMap(fData);
    let isFriend = false;
    
    for (let i = 1; i < fData.length; i++) {
      const u1 = fData[i][fCols["userId1"]];
      const u2 = fData[i][fCols["userId2"]];
      const st = fData[i][fCols["status"]];
      if (st === "active" && ((u1 === currentUserId && u2 === targetUserId) || (u1 === targetUserId && u2 === currentUserId))) {
        isFriend = true;
        break;
      }
    }
    
    if (!isFriend) {
      return { success: false, message: "Chỉ có thể chat với người dùng trong danh sách bạn bè." };
    }
    
    // 2. Lấy thông tin targetUser
    const uData = usersSheet.getDataRange().getValues();
    const uCols = getSheetColumnMap(uData);
    let targetUserInfo = null;
    for(let i=1; i < uData.length; i++) {
      if(uData[i][uCols["userId"]] === targetUserId) {
        targetUserInfo = {
          userId: targetUserId,
          displayName: uData[i][uCols["displayName"]],
          avatar: uData[i][uCols["avatarUrl"]] || getGravatarUrl(uData[i][uCols["email"]] || ""),
          playerId: uData[i][uCols["playerId"]]
        };
        break;
      }
    }
    
    // 3. Tìm Conversation đã có
    const cData = convSheet.getDataRange().getValues();
    const cCols = getSheetColumnMap(cData);
    let conversationId = null;
    
    for(let i = 1; i < cData.length; i++) {
      const u1 = cData[i][cCols["userId1"]];
      const u2 = cData[i][cCols["userId2"]];
      if ((u1 === currentUserId && u2 === targetUserId) || (u1 === targetUserId && u2 === currentUserId)) {
        // If conversation exists but is marked removed for current user, treat as non-existing
        if (cCols["removedFor"]) {
            const removedRaw = (cData[i][cCols["removedFor"]] || "").toString();
            const removedList = removedRaw ? removedRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
            const idx = removedList.indexOf(currentUserId);
            if (idx !== -1) {
              // Restore conversation visibility for this user when they open it
              removedList.splice(idx, 1);
              try {
                convSheet.getRange(i + 1, cCols["removedFor"] + 1).setValue(removedList.join(','));
              } catch (e) {
                Logger.log('Warning: cannot clear removedFor on openConversationApi: ' + e.toString());
              }
              // continue to set conversationId below
            }
        }
        conversationId = cData[i][cCols["conversationId"]];
        break;
      }
    }
    
    const now = new Date();
    
    // 4. Nếu chưa có -> tạo mới
    if (!conversationId) {
      conversationId = generateNextId(convSheet, "CNV");
      // Quy tắc userId1 < userId2 
      const u1 = currentUserId < targetUserId ? currentUserId : targetUserId;
      const u2 = currentUserId < targetUserId ? targetUserId : currentUserId;
      
      // conversationId, userId1, userId2, lastMessage, lastMessageAt, createdAt, updatedAt
      convSheet.appendRow([conversationId, u1, u2, "", "", now, now]);
    }
    
    // (Ở giai đoạn này chúng ta chưa lấy Messages, sẽ xử lý ở GĐ10)
    // Trả về info để UI vẽ khung Chat
    return {
      success: true,
      conversationId: conversationId,
      friendInfo: targetUserInfo
    };
    
  } catch(error) {
    Logger.log("Error openConversationApi: " + error.toString());
    return { success: false, message: "Lỗi mở cuộc trò chuyện." };
  }
}

/**
 * Lấy lịch sử tin nhắn
 */
function getMessagesApi(payload) {
  try {
    const request = payload || {};
    const conversationId = String(request.conversationId || "").trim();
    const beforeTimestamp = request.beforeTimestamp;
    const afterTimestamp = request.afterTimestamp;
    const userId = request.userId; // Trích xuất userId
    
    if (!conversationId) return { success: false, message: "Thiếu conversationId." };
    if (!userId) return { success: false, message: "Thiếu userId." };
    
    const userSs = getUserSpreadsheet(userId);
    if (!userSs) return { success: false, message: "Không tìm thấy dữ liệu người dùng." };
    
    const msgSheet = userSs.getSheetByName("Messages");
    // Nếu sheet không tồn tại, có nghĩa là chưa có tin nhắn nào
    if (!msgSheet) return { success: true, results: [] };

    const lastRow = msgSheet.getLastRow();
    if (lastRow < 2) return { success: true, results: [] };

    const lastCol = msgSheet.getLastColumn();
    const maxRowsToScan = 300;
    const startRow = Math.max(2, lastRow - maxRowsToScan + 1);
    const mData = msgSheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
    const headerData = msgSheet.getRange(1, 1, 1, lastCol).getValues();
    const mCols = getSheetColumnMap(headerData);
    
    const messages = [];
    
    // Parse timestamps if provided
    const beforeTime = beforeTimestamp ? new Date(beforeTimestamp).getTime() : null;
    const afterTime = afterTimestamp ? new Date(afterTimestamp).getTime() : null;
    
    // Quét từ dưới lên để lấy tin nhắn
    for (let i = mData.length - 1; i >= 0; i--) {
      if (String(mData[i][mCols["conversationId"]] || "").trim() === conversationId) {
        const createdAtRaw = mData[i][mCols["createdAt"]];
        const msgTime = createdAtRaw ? new Date(createdAtRaw).getTime() : 0;
        
        if (beforeTime && msgTime >= beforeTime) continue;
        if (afterTime && msgTime <= afterTime) continue;
        
        messages.unshift({ // đẩy vào đầu mảng để giữ đúng thứ tự thời gian (cũ -> mới)
          messageId: mData[i][mCols["messageId"]],
          senderId: mData[i][mCols["senderId"]],
          receiverId: mData[i][mCols["receiverId"]],
          text: mData[i][mCols["messageText"]],
          isRead: mData[i][mCols["isRead"]],
          createdAt: createdAtRaw ? new Date(createdAtRaw).toISOString() : ""
        });
        
        if (messages.length >= 40 && !afterTime) break; // Giảm tải initial load/polling
      }
    }
    
    return { success: true, results: messages };
  } catch(error) {
    Logger.log("Error getMessagesApi: " + error.toString());
    return { success: false, message: "Lỗi lấy tin nhắn." };
  }
}

/**
 * Gửi tin nhắn
 */
function sendMessageApi(conversationId, senderId, receiverId, text) {
  try {
    if (!text || text.trim() === "") {
      return { success: false, message: "Tin nhắn không được để trống." };
    }
    if (text.length > 1000) {
      return { success: false, message: "Tin nhắn quá dài." };
    }
    
    const ss = getOrCreateDatabase();
    
    // Validate Friend
    const friendsSheet = ss.getSheetByName("Friends");
    const fData = friendsSheet.getDataRange().getValues();
    const fCols = getSheetColumnMap(fData);
    let isFriend = false;
    for (let i = 1; i < fData.length; i++) {
      const u1 = fData[i][fCols["userId1"]];
      const u2 = fData[i][fCols["userId2"]];
      const st = fData[i][fCols["status"]];
      if (st === "active" && ((u1 === senderId && u2 === receiverId) || (u1 === receiverId && u2 === senderId))) {
        isFriend = true;
        break;
      }
    }
    
    if (!isFriend) {
      return { success: false, message: "Bạn chỉ có thể nhắn tin với bạn bè." };
    }
    
    const convSheet = ss.getSheetByName("Conversations");
    if (!convSheet) return { success: false, message: "Lỗi database" };
    
    const senderSs = getUserSpreadsheet(senderId);
    const receiverSs = getUserSpreadsheet(receiverId);
    
    if (!senderSs || !receiverSs) {
      return { success: false, message: "Lỗi kết nối tới dữ liệu người dùng." };
    }
    
    let senderMsgSheet = senderSs.getSheetByName("Messages");
    if (!senderMsgSheet) {
      senderMsgSheet = createUserSheet(senderSs, USER_DB_CONFIG.SHEETS.MESSAGES);
    }
    
    let receiverMsgSheet = receiverSs.getSheetByName("Messages");
    if (!receiverMsgSheet) {
      receiverMsgSheet = createUserSheet(receiverSs, USER_DB_CONFIG.SHEETS.MESSAGES);
    }
    
    const now = new Date();
    // Generate unique message ID
    const messageId = "MSG" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    
    // Lưu Message: messageId, conversationId, senderId, receiverId, messageText, isRead, createdAt
    const msgRow = [messageId, conversationId, senderId, receiverId, text, false, now];
    
    // Append to BOTH personal sheets
    senderMsgSheet.appendRow(msgRow);
    receiverMsgSheet.appendRow(msgRow);
    
    // Cập nhật Conversation
    const cData = convSheet.getDataRange().getValues();
    const cCols = getSheetColumnMap(cData);
    for (let i = 1; i < cData.length; i++) {
      if (cData[i][cCols["conversationId"]] === conversationId) {
        // Use setValues for faster execution
        convSheet.getRange(i + 1, cCols["lastMessage"] + 1, 1, 3).setValues([[text, now, now]]);
        break;
      }
    }
    
    return { success: true, data: {
      messageId: messageId,
      senderId: senderId,
      text: text,
      createdAt: now.toISOString() // Fix serialization issue
    }};
    
  } catch(error) {
    Logger.log("Error sendMessageApi: " + error.toString());
    return { success: false, message: "Không thể gửi tin nhắn." };
  }
}

/**
 * Đánh dấu tin nhắn đã đọc
 */
function markMessagesAsReadApi(conversationId, currentUserId) {
  try {
    const userSs = getUserSpreadsheet(currentUserId);
    if (!userSs) return { success: false };
    
    const msgSheet = userSs.getSheetByName("Messages");
    if (!msgSheet) return { success: false };
    
    const mData = msgSheet.getDataRange().getValues();
    const mCols = getSheetColumnMap(mData);
    
    let updated = false;
    // Quét từ dưới lên, đánh dấu tất cả các tin chưa đọc mà mình là receiver
    for (let i = mData.length - 1; i >= 1; i--) {
      if (mData[i][mCols["conversationId"]] === conversationId && 
          mData[i][mCols["receiverId"]] === currentUserId &&
          mData[i][mCols["isRead"]] === false) {
        
        msgSheet.getRange(i + 1, mCols["isRead"] + 1).setValue(true);
        updated = true;
      }
      
      // Tối ưu: Nếu quét xuống gặp tin đã đọc của conversation này thì có thể break (vì tin mới nhất đã đọc thì tin cũ cũng thường đã đọc, nhưng để an toàn cứ quét một chút hoặc quét hết)
      // Để an toàn và đơn giản với lượng dữ liệu nhỏ, quét hết.
    }
    
    return { success: true, updated: updated };
  } catch(error) {
    Logger.log("Error markMessagesAsReadApi: " + error.toString());
    return { success: false };
  }
}

/**
 * Lấy danh sách Cuộc trò chuyện (Conversations)
 */
function getConversationsApi(currentUserId) {
  try {
    const userIdTrim = (currentUserId || "").toString().trim();
    const ss = getOrCreateDatabase();
    const convSheet = ss.getSheetByName("Conversations");
    const usersSheet = ss.getSheetByName("Users");
    
    const userSs = getUserSpreadsheet(userIdTrim);
    let msgSheet = null;
    if (userSs) {
      msgSheet = userSs.getSheetByName("Messages");
    }

    if (!convSheet || !usersSheet) {
      return { success: false, message: "Lỗi cơ sở dữ liệu." };
    }

    const cData = convSheet.getDataRange().getValues();
    const cCols = getSheetColumnMap(cData);

    const userConversations = [];

    for (let i = 1; i < cData.length; i++) {
      const u1 = (cData[i][cCols["userId1"]] || "").toString().trim();
      const u2 = (cData[i][cCols["userId2"]] || "").toString().trim();

      // Respect per-user removal flag: skip conversations removed for this user
      if (cCols["removedFor"]) {
        const removedRaw = (cData[i][cCols["removedFor"]] || "").toString();
        const removedList = removedRaw ? removedRaw.split(',').map(s => s.trim()) : [];
        if (removedList.indexOf(userIdTrim) !== -1) {
          continue;
        }
      }

      if (u1 === userIdTrim || u2 === userIdTrim) {
        const friendId = (u1 === userIdTrim) ? u2 : u1;
        userConversations.push({
          conversationId: (cData[i][cCols["conversationId"]] || "").toString(),
          friendId: friendId,
          lastMessage: cData[i][cCols["lastMessage"]] || "",
          lastMessageAt: cData[i][cCols["lastMessageAt"]] || "",
          unreadCount: 0
        });
      }
    }

    if (userConversations.length === 0) {
      return { success: true, results: [] };
    }

    // Count unread messages from personal sheet
    if (msgSheet) {
      const mLastRow = msgSheet.getLastRow();
      const mLastCol = msgSheet.getLastColumn();

      if (mLastRow >= 2 && mLastCol > 0) {
        const mHeader = msgSheet.getRange(1, 1, 1, mLastCol).getValues();
        const mCols = getSheetColumnMap(mHeader);

        const maxRowsToScan = 1500;
        const startRow = Math.max(2, mLastRow - maxRowsToScan + 1);
        const mData = msgSheet.getRange(startRow, 1, mLastRow - startRow + 1, mLastCol).getValues();

        for (let i = 0; i < mData.length; i++) {
          const receiver = (mData[i][mCols["receiverId"]] || "").toString().trim();
          const isRead = mData[i][mCols["isRead"]];
          if (receiver === userIdTrim && (isRead === false || String(isRead).toLowerCase() === "false")) {
            const cid = (mData[i][mCols["conversationId"]] || "").toString();
            const conv = userConversations.find(c => c.conversationId === cid);
            if (conv) conv.unreadCount += 1;
          }
        }
      }
    }

    // Map user info for friend display
    const uData = usersSheet.getDataRange().getValues();
    const uCols = getSheetColumnMap(uData);
    const userMap = {};
    for (let i = 1; i < uData.length; i++) {
      const uid = (uData[i][uCols["userId"]] || "").toString().trim();
      if (!uid) continue;
      userMap[uid] = {
        userId: uid,
        playerId: (uData[i][uCols["playerId"]] || "").toString(),
        displayName: (uData[i][uCols["displayName"]] || "").toString(),
        avatar: (uData[i][uCols["avatarUrl"]] || "https://www.gravatar.com/avatar/?d=mp").toString()
      };
    }

    // Attach friend info
    userConversations.forEach(conv => {
      const info = userMap[conv.friendId] || { displayName: "Ẩn danh", avatar: "https://www.gravatar.com/avatar/?d=mp", playerId: "" };
      conv.friendName = info.displayName;
      conv.friendAvatar = info.avatar;
      conv.friendPlayerId = info.playerId;
    });

    // Sort by lastMessageAt desc if available
    userConversations.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });

    return { success: true, results: userConversations };
  } catch (error) {
    Logger.log("Error getConversationsApi: " + error.toString());
    return { success: false, message: "Lỗi lấy danh sách cuộc trò chuyện." };
  }
}

/**
 * Lấy số lượng thông báo (tin nhắn chưa đọc + lời mời pending)
 * API nhẹ dùng cho global badge trên thanh nav
 */
function getNotificationCountsApi(currentUserId, activeConversationId = null) {
  try {
    const userIdTrim = (currentUserId || "").toString().trim();
    const ss = getOrCreateDatabase();
    const convSheet = ss.getSheetByName("Conversations");
    const friendsSheet = ss.getSheetByName("Friends");
    let totalUnread = 0;
    let pendingRequests = 0;
    const unreadByFriendId = {};
    const unreadByConversation = {};
    let friendListVersion = 0;

    const conversationFriendMap = {};
    if (convSheet) {
      const cData = convSheet.getDataRange().getValues();
      const cCols = getSheetColumnMap(cData);

      for (let i = 1; i < cData.length; i++) {
        const u1 = (cData[i][cCols["userId1"]] || "").toString().trim();
        const u2 = (cData[i][cCols["userId2"]] || "").toString().trim();
        const conversationId = (cData[i][cCols["conversationId"]] || "").toString().trim();

        if (!conversationId) continue;
        // Respect per-user removal flag by storing removedFor list for this conversation
        let removedForList = [];
        if (cCols["removedFor"]) {
          const removedRaw = (cData[i][cCols["removedFor"]] || "").toString();
          removedForList = removedRaw ? removedRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        }

        if (u1 === userIdTrim) {
          conversationFriendMap[conversationId] = { friendId: u2, removedFor: removedForList };
        } else if (u2 === userIdTrim) {
          conversationFriendMap[conversationId] = { friendId: u1, removedFor: removedForList };
        }
      }
    }

    if (friendsSheet) {
      const fData = friendsSheet.getDataRange().getValues();
      const fCols = getSheetColumnMap(fData);

      // Build a quick lookup of active friends for current user
      const activeFriends = {};

      for (let i = 1; i < fData.length; i++) {
        const u1 = (fData[i][fCols["userId1"]] || "").toString().trim();
        const u2 = (fData[i][fCols["userId2"]] || "").toString().trim();
        const updatedAtRaw = fData[i][fCols["updatedAt"]];
        const st = (fData[i][fCols["status"]] || "").toString().trim();

        if (u1 !== userIdTrim && u2 !== userIdTrim) continue;

        if (st === "active") {
          const other = (u1 === userIdTrim) ? u2 : u1;
          activeFriends[other] = true;
        }

        const updatedAt = new Date(updatedAtRaw);
        const updatedAtTime = updatedAt.getTime();
        if (!isNaN(updatedAtTime) && updatedAtTime > friendListVersion) {
          friendListVersion = updatedAtTime;
        }
      }
    }
    
    // Đếm tin nhắn chưa đọc từ personal sheet
    const userSs = getUserSpreadsheet(userIdTrim);
    if (userSs) {
      const msgSheet = userSs.getSheetByName("Messages");
      if (msgSheet) {
        const mLastRow = msgSheet.getLastRow();
        const mLastCol = msgSheet.getLastColumn();

        if (mLastRow >= 2 && mLastCol > 0) {
          const mHeader = msgSheet.getRange(1, 1, 1, mLastCol).getValues();
          const mCols = getSheetColumnMap(mHeader);

          const maxRowsToScan = 1500;
          const startRow = Math.max(2, mLastRow - maxRowsToScan + 1);
          const mData = msgSheet.getRange(startRow, 1, mLastRow - startRow + 1, mLastCol).getValues();

          for (let i = 0; i < mData.length; i++) {
            const receiver = (mData[i][mCols["receiverId"]] || "").toString().trim();
            const convId = (mData[i][mCols["conversationId"]] || "").toString().trim();
            const isRead = mData[i][mCols["isRead"]];

            if (receiver === userIdTrim && (isRead === false || String(isRead).toLowerCase() === "false")) {
              // Ignore messages from the currently active conversation
              if (!activeConversationId || convId !== activeConversationId) {
                // Only count if the conversation maps to a friend and the friend relationship is active,
                // and the conversation is not marked removed for this user.
                const convMeta = conversationFriendMap[convId];
                if (convMeta && convMeta.friendId) {
                  const friendId = convMeta.friendId;
                  const removedList = convMeta.removedFor || [];
                  if (removedList.indexOf(userIdTrim) !== -1) {
                    // conversation is hidden for this user -> ignore unread here
                    continue;
                  }

                  if (activeFriends && activeFriends[friendId]) {
                    totalUnread++;
                    unreadByConversation[convId] = (unreadByConversation[convId] || 0) + 1;
                    unreadByFriendId[friendId] = (unreadByFriendId[friendId] || 0) + 1;
                  } else {
                    // Not friends currently: ignore message in global unread counts
                    continue;
                  }
                } else {
                  // No mapping to a conversation friend (maybe conv missing) -> ignore
                  continue;
                }
              }
            }
          }
        }
      }
    }
    
    // Đếm lời mời pending
    const reqSheet = ss.getSheetByName("FriendRequests");
    if (reqSheet) {
      const rData = reqSheet.getDataRange().getValues();
      const rCols = getSheetColumnMap(rData);
      
      for (let i = 1; i < rData.length; i++) {
        const toId = (rData[i][rCols["toUserId"]] || "").toString().trim();
        const status = (rData[i][rCols["status"]] || "").toString().trim();
        if (toId === userIdTrim && status === "pending") {
          pendingRequests++;
        }
      }
    }
    
    return {
      success: true,
      totalUnread: totalUnread,
      pendingRequests: pendingRequests,
      unreadByFriendId: unreadByFriendId,
      unreadByConversation: unreadByConversation,
      friendListVersion: friendListVersion
    };
  } catch(error) {
    Logger.log("Error getNotificationCountsApi: " + error.toString());
    return { success: false, totalUnread: 0, pendingRequests: 0, unreadByFriendId: {}, unreadByConversation: {}, friendListVersion: 0 };
  }
}
