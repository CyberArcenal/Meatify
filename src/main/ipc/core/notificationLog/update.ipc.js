// src/main/ipc/core/notificationLog/update.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", status, errorMessage } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }
  if (!status) {
    return { status: false, message: "Status is required for update", data: null };
  }

  try {
    const result = await notificationLogService.updateReminderStatus(
      { id, status, errorMessage: errorMessage || null },
      user,
      queryRunner
    );
    return {
      status: true,
      message: "Notification log updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateLog:", error);
    return {
      status: false,
      message: error.message || "Failed to update notification log",
      data: null,
    };
  }
};