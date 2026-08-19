// src/main/ipc/core/notification/get/all.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    };

    const result = await notificationService.findAll(options);
    return {
      status: true,
      message: "Notifications retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllNotifications:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notifications",
      data: null,
    };
  }
};