// src/main/ipc/core/notificationLog/bulk_update.ipc.js
//@ts-check
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
        if (!id || typeof id !== "number") {
          results.errors.push({ id, error: "Valid ID is required" });
          continue;
        }

        // Use generic update for full flexibility, or updateReminderStatus if only status
        let result;
        if (updates.status && Object.keys(updates).length === 1) {
          // If only status, use specific method
          result = await notificationLogService.updateReminderStatus(
            { id, status: updates.status, errorMessage: updates.errorMessage || null },
            user,
            queryRunner
          );
        } else {
          // For other fields (channel, etc.), use generic update
          result = await notificationLogService.update(id, updates, user, queryRunner);
        }
        
        results.updated.push(result);
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