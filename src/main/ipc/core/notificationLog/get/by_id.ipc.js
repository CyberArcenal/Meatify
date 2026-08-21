// src/main/ipc/core/notificationLog/get/by_id.ipc.js
const notificationLogService = require("../../../../../services/NotificationLog");
module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid log ID is required", data: null };
  }

  try {
    const result = await notificationLogService.getReminderById({ id });
    return {
      status: true,
      message: "Notification log retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getLogById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification log",
      data: null,
    };
  }
};