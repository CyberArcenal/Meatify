// src/main/ipc/core/notificationLog/delete.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  try {
    await notificationLogService.deleteReminder({ id }, user, queryRunner);
    return {
      status: true,
      message: "Notification log deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in deleteLog:", error);
    return {
      status: false,
      message: error.message || "Failed to delete notification log",
      data: null,
    };
  }
};