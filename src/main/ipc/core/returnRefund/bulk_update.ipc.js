// src/main/ipc/core/returnRefund/bulk_update.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

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

        // Handle status-specific updates
        if (updates.status) {
          switch (updates.status) {
            case "processed":
              await returnRefundService.processReturn(id, user, queryRunner);
              break;
            case "cancelled":
              await returnRefundService.cancelReturn(id, updates.reason || "", user, queryRunner);
              break;
            default:
              // For other statuses, use generic update
              await returnRefundService.update(id, updates, user, queryRunner);
          }
        } else {
          // Generic update
          await returnRefundService.update(id, updates, user, queryRunner);
        }

        results.updated.push({ id, status: "success" });
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
    console.error("Error in bulkUpdateReturns:", error);
    return {
      status: false,
      message: error.message || "Bulk update failed",
      data: null,
    };
  }
};