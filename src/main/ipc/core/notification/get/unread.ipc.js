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
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
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