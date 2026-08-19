// src/main/ipc/core/notification/search.ipc.js
const notificationService = require("../../../../services/Notification");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, userId, isRead, type, startDate, endDate, includeDeleted, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      userId,
      isRead,
      type,
      startDate,
      endDate,
      includeDeleted,
      ...filters,
    };

    const result = await notificationService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchNotifications:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};