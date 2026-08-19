// src/main/ipc/core/notificationLog/get/all.ipc.js
const { ReminderLogService } = require("../../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    };

    const result = await reminderLogService.getAllReminders(options);
    return {
      status: true,
      message: "Notification logs retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllLogs:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification logs",
      data: null,
    };
  }
};