// src/main/ipc/core/notificationLog/permanent_delete.ipc.js
const { ReminderLogService } = require("../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  try {
    await reminderLogService.deleteReminder({ id }, user, queryRunner);
    return {
      status: true,
      message: "Notification log permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteLog:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete notification log",
      data: null,
    };
  }
};