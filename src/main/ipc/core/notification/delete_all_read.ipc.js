// src/main/ipc/core/notification/delete_all_read.ipc.js
//@ts-check
const notificationService = require("../../../../services/Notification");

module.exports = async (params, queryRunner) => {
  // userId can be null for system-wide deletion
  const { userId = null, user = "system" } = params;

  // Validate: if userId is provided, it must be a number
  if (userId !== null && typeof userId !== "number") {
    return { status: false, message: "userId must be a number or null", data: null };
  }

  try {
    const result = await notificationService.deleteAllRead(userId, user, queryRunner);
    const scope = userId ? `user #${userId}` : "system";
    return {
      status: true,
      message: `${result.count} read notifications deleted ${scope}`,
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteAllRead:", error);
    return {
      status: false,
      message: error.message || "Failed to delete read notifications",
      data: null,
    };
  }
};