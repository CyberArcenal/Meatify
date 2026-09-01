// src/main/ipc/core/notificationLog/search.ipc.js
//@ts-check
const notificationLogService = require("../../../../services/NotificationLog");

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

    if (search) {
      const result = await notificationLogService.searchReminders({ keyword: search, page, limit });
      return {
        status: true,
        message: "Search completed successfully",
        data: {
          data: result.data,
          pagination: result.pagination,
        },
      };
    }

    const result = await notificationLogService.getAllReminders(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
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