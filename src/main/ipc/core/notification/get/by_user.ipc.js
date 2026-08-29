// src/main/ipc/core/notification/get/by_user.ipc.js
const notificationService = require("../../../../../services/Notification");

module.exports = async (params) => {
  const { userId, isRead, page, limit, includeDeleted = false } = params;

  if (!userId || typeof userId !== "number") {
    return { status: false, message: "Valid user ID is required", data: null };
  }

  try {
    const options = {
      userId,
      isRead,
      page,
      limit,
      includeDeleted,
      sortBy: "createdAt",
      sortOrder: "DESC",
    };
    const result = await notificationService.findAll(options);
    return {
      status: true,
      message: "Notifications retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getNotificationsByUser:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve notifications by user",
      data: null,
    };
  }
};