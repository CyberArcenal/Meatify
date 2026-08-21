// src/main/ipc/core/notification/delete_all_read.ipc.js
const { NotificationStateService } = require("../../../../stateServices/Notification");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { userId, user = "system" } = params;

  if (!userId || typeof userId !== "number") {
    return { status: false, message: "Valid user ID is required", data: null };
  }

  try {
    const stateService = new NotificationStateService(AppDataSource);
    const result = await stateService.deleteAllRead(userId, user, queryRunner);
    return {
      status: true,
      message: `${result.count} read notifications deleted for user #${userId}`,
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