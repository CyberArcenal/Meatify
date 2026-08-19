// src/main/ipc/core/notification/export.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await notificationService.exportNotifications(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportNotifications:", error);
    return {
      status: false,
      message: error.message || "Failed to export notifications",
      data: null,
    };
  }
};