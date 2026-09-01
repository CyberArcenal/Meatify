// src/main/ipc/core/notification/mark_as_unread.ipc.js
//@ts-check
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { notificationId, user = "system" } = params;

  if (!notificationId || typeof notificationId !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  try {
    const result = await notificationService.markAsUnread(notificationId, user, queryRunner);
    return {
      status: true,
      message: `Notification #${notificationId} marked as unread`,
      data: result,
    };
  } catch (error) {
    console.error("Error in markAsUnread:", error);
    return {
      status: false,
      message: error.message || "Failed to mark notification as unread",
      data: null,
    };
  }
};