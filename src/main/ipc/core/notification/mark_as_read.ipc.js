// src/main/ipc/core/notification/mark_as_read.ipc.js
//@ts-check
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { notificationId, user = "system" } = params;

  if (!notificationId || typeof notificationId !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  try {
    const result = await notificationService.markAsRead(notificationId, user, queryRunner);
    return {
      status: true,
      message: `Notification #${notificationId} marked as read`,
      data: result,
    };
  } catch (error) {
    console.error("Error in markAsRead:", error);
    return {
      status: false,
      message: error.message || "Failed to mark notification as read",
      data: null,
    };
  }
};