// src/main/ipc/core/notificationLog/search.ipc.js
const { ReminderLogService } = require("../../../../services/ReminderLog");
const reminderLogService = new ReminderLogService();

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, status, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      startDate,
      endDate,
      ...filters,
    };

    // If search keyword provided, use search method
    if (search) {
      const result = await reminderLogService.searchReminders({ keyword: search, page, limit });
      return {
        status: true,
        message: "Search completed successfully",
        data: {
          data: result.data,
          pagination: result.pagination,
        },
      };
    }

    // Otherwise use getAllReminders with filters
    const result = await reminderLogService.getAllReminders(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchLogs:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};