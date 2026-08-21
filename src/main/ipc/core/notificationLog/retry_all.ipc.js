// src/main/ipc/core/notificationLog/retry_all.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { filters = {}, user = "system" } = params;

  try {
    const result = await notificationLogService.retryAllFailedReminders({ filters }, user, queryRunner);
    return {
      status: true,
      message: `Retry completed. ${result.successCount} succeeded, ${result.failCount} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in retryAllFailed:", error);
    return {
      status: false,
      message: error.message || "Failed to retry failed notification logs",
      data: null,
    };
  }
};