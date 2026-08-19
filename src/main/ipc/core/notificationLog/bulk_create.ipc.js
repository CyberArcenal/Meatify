// src/main/ipc/core/notificationLog/bulk_create.ipc.js
const { ReminderLogService } = require("../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params, queryRunner) => {
  const { logsArray, user = "system" } = params;

  if (!Array.isArray(logsArray) || logsArray.length === 0) {
    return {
      status: false,
      message: "logsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await reminderLogService.bulkCreate(logsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateLogs:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};