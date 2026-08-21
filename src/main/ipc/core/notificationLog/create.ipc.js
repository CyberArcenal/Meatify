// src/main/ipc/core/notificationLog/create.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.to) {
    return { status: false, message: "recipient (to) is required", data: null };
  }
  if (!data.subject) {
    return { status: false, message: "subject is required", data: null };
  }
  if (!data.html && !data.text) {
    return { status: false, message: "html or text content is required", data: null };
  }

  try {
    const result = await notificationLogService.createReminder(data, user, queryRunner);
    return {
      status: true,
      message: "Notification log created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createLog:", error);
    return {
      status: false,
      message: error.message || "Failed to create notification log",
      data: null,
    };
  }
};