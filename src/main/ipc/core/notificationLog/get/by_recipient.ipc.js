// src/main/ipc/core/notificationLog/get/by_recipient.ipc.js
const notificationLogService = require("../../../../../services/NotificationLog");
module.exports = async (params) => {
  const { recipientEmail, page, limit } = params;

  if (!recipientEmail) {
    return { status: false, message: "recipientEmail is required", data: null };
  }

  try {
    const result = await notificationLogService.getAllReminders({
      recipient_email: recipientEmail,
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
    console.error("Error in getLogsByRecipient:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification logs by recipient",
      data: null,
    };
  }
};