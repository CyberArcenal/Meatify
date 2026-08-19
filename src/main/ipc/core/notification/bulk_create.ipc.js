// src/main/ipc/core/notification/bulk_create.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { notificationsArray, user = "system" } = params;

  if (!Array.isArray(notificationsArray) || notificationsArray.length === 0) {
    return {
      status: false,
      message: "notificationsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await notificationService.bulkCreate(notificationsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateNotifications:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};