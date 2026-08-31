// src/main/ipc/core/purchase/delete.ipc.js
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    // Use cancel instead of delete (soft delete via status change)
    const result = await purchaseService.cancel(id, "Deleted by user", user, queryRunner);
    return {
      status: true,
      message: "Purchase cancelled successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deletePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to cancel purchase",
      data: null,
    };
  }
};