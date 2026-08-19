// src/main/ipc/core/notification/update.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  // Prevent updating isRead and userId through this endpoint
  if (data.isRead !== undefined) {
    return {
      status: false,
      message: "Use markAsRead or markAsUnread to update read status",
      data: null,
    };
  }
  if (data.userId !== undefined) {
    return {
      status: false,
      message: "Cannot update userId",
      data: null,
    };
  }

  try {
    const result = await notificationService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Notification updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateNotification:", error);
    return {
      status: false,
      message: error.message || "Failed to update notification",
      data: null,
    };
  }
};