// src/main/ipc/core/notification/restore.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  try {
    const result = await notificationService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Notification restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreNotification:", error);
    return {
      status: false,
      message: error.message || "Failed to restore notification",
      data: null,
    };
  }
};