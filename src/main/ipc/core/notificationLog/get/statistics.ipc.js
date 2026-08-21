// src/main/ipc/core/notificationLog/get/statistics.ipc.js
const notificationLogService = require("../../../../../services/NotificationLog");
module.exports = async (params) => {
  const { startDate, endDate } = params || {};

  try {
    const result = await notificationLogService.getReminderStats({ startDate, endDate });
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