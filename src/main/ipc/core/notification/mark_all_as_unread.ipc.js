// src/main/ipc/core/notification/mark_all_as_unread.ipc.js
const { NotificationStateService } = require("../../../../stateServices/NotificationStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { userId, user = "system" } = params;

  if (!userId || typeof userId !== "number") {
    return { status: false, message: "Valid user ID is required", data: null };
  }

  try {
    const stateService = new NotificationStateService(AppDataSource);
    const result = await stateService.markAllAsUnread(userId, user, queryRunner);
    return {
      status: true,
      message: `${result.count} notifications marked as unread for user #${userId}`,
      data: result,
    };
  } catch (error) {
    console.error("Error in markAllAsUnread:", error);
    return {
      status: false,
      message: error.message || "Failed to mark all notifications as unread",
      data: null,
    };
  }
};