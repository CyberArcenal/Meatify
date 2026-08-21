// src/main/ipc/core/notificationLog/bulk_update.ipc.js
const notificationLogService = require("../../../../services/NotificationLog");

module.exports = async (params, queryRunner) => {
  const { updatesArray, user = "system" } = params;

  if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
    return {
      status: false,
      message: "updatesArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        if (updates.status) {
          const result = await notificationLogService.updateReminderStatus(
            { id, status: updates.status, errorMessage: updates.errorMessage || null },
            user,
            queryRunner
          );
          results.updated.push(result);
        } else {
          results.errors.push({ id, error: "Status is required for update" });
        }
      } catch (err) {
        results.errors.push({ id, error: err.message });
      }
    }
    return {
      status: true,
      message: `Bulk update completed. ${results.updated.length} updated, ${results.errors.length} failed.`,
      data: results,
    };
  } catch (error) {
    console.error("Error in bulkUpdateLogs:", error);
    return {
      status: false,
      message: error.message || "Bulk update failed",
      data: null,
    };
  }
};