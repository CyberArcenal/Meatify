// src/main/ipc/core/notificationLog/get/by_status.ipc.js
const notificationLogService = require("../../../../../services/NotificationLog");
module.exports = async (params) => {
  const { status, page, limit } = params;

  if (!status) {
    return { status: false, message: "status is required", data: null };
  }

  try {
    const result = await notificationLogService.getAllReminders({
      status,
      page,
      limit,
      sortBy: "created_at",
      sortOrder: "DESC",
    });
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