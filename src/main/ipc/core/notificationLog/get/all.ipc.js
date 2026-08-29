// src/main/ipc/core/notificationLog/get/all.ipc.js
//@ts-check
const notificationLogService = require("../../../../../services/NotificationLog");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = { page, limit, sortBy, sortOrder, ...filters };
    const result = await notificationLogService.getAllReminders(options);
    return {
      status: true,
      message: "Notification logs retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getAllLogs:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notification logs",
      data: null,
    };
  }
};