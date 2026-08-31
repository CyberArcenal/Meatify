// src/main/ipc/core/purchase/cancel_purchase.ipc.js
//@ts-check
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { purchaseId, reason = "", user = "system" } = params;

  if (!purchaseId || typeof purchaseId !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const result = await purchaseService.cancel(purchaseId, reason, user, queryRunner);
    return {
      status: true,
      message: `Purchase #${purchaseId} cancelled successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in cancelPurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to cancel purchase",
      data: null,
    };
  }
};