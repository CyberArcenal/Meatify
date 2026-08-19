// src/main/ipc/core/notificationLog/delete.ipc.js
const { ReminderLogService } = require("../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  try {
    // NotificationLog uses hard delete only (no soft delete)
    await reminderLogService.deleteReminder({ id }, user, queryRunner);
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