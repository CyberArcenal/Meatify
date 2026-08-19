// src/main/ipc/core/notification/create.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.title) {
    return { status: false, message: "title is required", data: null };
  }
  if (!data.message) {
    return { status: false, message: "message is required", data: null };
  }
  if (!data.userId) {
    return { status: false, message: "userId is required", data: null };
  }

  try {
    const result = await notificationService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Notification created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createNotification:", error);
    return {
      status: false,
      message: error.message || "Failed to create notification",
      data: null,
    };
  }
};