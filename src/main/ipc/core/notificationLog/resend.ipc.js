// src/main/ipc/core/notificationLog/resend.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  try {
    const result = await notificationLogService.resendReminder({ id }, user, queryRunner);
    return {
      status: true,
      message: `Notification log #${id} resent successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in resendLog:", error);
    return {
      status: false,
      message: error.message || "Failed to resend notification log",
      data: null,
    };
  }
};