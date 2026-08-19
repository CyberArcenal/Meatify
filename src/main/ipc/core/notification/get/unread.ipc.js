// src/main/ipc/core/notification/get/unread.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async (params) => {
  const { userId, page, limit } = params;

  if (!userId || typeof userId !== "number") {
    return { status: false, message: "Valid user ID is required", data: null };
  }

  try {
    const options = {
      userId,
      isRead: false,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
    };
    const result = await notificationService.findAll(options);
    return {
      status: true,
      message: "Unread notifications retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getUnreadNotifications:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve unread notifications",
      data: null,
    };
  }
};