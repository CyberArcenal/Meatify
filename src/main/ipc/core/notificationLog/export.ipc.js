// src/main/ipc/core/notificationLog/export.ipc.js
//@ts-check
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await notificationLogService.exportLogs(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportLogs:", error);
    return {
      status: false,
      message: error.message || "Failed to export notification logs",
      data: null,
    };
  }
};