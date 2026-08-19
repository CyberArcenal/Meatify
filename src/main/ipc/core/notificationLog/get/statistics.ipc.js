// src/main/ipc/core/notificationLog/get/statistics.ipc.js
const { ReminderLogService } = require("../../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params) => {
  const { startDate, endDate } = params || {};

  try {
    const result = await reminderLogService.getReminderStats({ startDate, endDate });
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getLogStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};