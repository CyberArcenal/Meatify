// src/main/ipc/core/notificationLog/get/by_status.ipc.js
const { ReminderLogService } = require("../../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params) => {
  const { status, page, limit } = params;

  if (!status) {
    return { status: false, message: "status is required", data: null };
  }

  try {
    const options = {
      status,
      page,
      limit,
      sortBy: "created_at",
      sortOrder: "DESC",
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
    console.error("Error in getLogsByStatus:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification logs by status",
      data: null,
    };
  }
};