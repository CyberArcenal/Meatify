// src/main/ipc/core/notificationLog/update.ipc.js
const { ReminderLogService } = require("../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  // Only allow updating status and error message
  if (data.status) {
    try {
      const result = await reminderLogService.updateReminderStatus(
        { id, status: data.status, errorMessage: data.errorMessage || null },
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
  }

  return {
    status: false,
    message: "Status is required for update",
    data: null,
  };
};