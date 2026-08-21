// src/main/ipc/core/notificationLog/retry.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  try {
    const result = await notificationLogService.retryReminder({ id }, user, queryRunner);
    return {
      status: true,
      message: `Notification log #${id} retried successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in retryLog:", error);
    return {
      status: false,
      message: error.message || "Failed to retry notification log",
      data: null,
    };
  }
};