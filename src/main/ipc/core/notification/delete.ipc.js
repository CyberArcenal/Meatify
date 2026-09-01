// src/main/ipc/core/notification/delete.ipc.js
//@ts-check
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  try {
    const result = await notificationService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Notification deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return {
      status: false,
      message: error.message || "Failed to delete notification",
      data: null,
    };
  }
};