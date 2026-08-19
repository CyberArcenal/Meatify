// src/main/ipc/core/notification/get/by_id.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async (params) => {
  const { id, includeDeleted = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  try {
    const result = await notificationService.findById(id, includeDeleted);
    return {
      status: true,
      message: "Notification retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getNotificationById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification",
      data: null,
    };
  }
};