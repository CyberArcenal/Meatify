// src/main/ipc/core/notification/get/statistics.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async () => {
  try {
    const result = await notificationService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getNotificationStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};