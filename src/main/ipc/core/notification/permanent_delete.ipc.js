// src/main/ipc/core/notification/permanent_delete.ipc.js
//@ts-check
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid notification ID is required", data: null };
  }

  try {
    await notificationService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Notification permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteNotification:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete notification",
      data: null,
    };
  }
};