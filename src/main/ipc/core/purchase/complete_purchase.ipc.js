// src/main/ipc/core/purchase/complete_purchase.ipc.js
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { purchaseId, user = "system" } = params;

  if (!purchaseId || typeof purchaseId !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const result = await purchaseService.complete(purchaseId, user, queryRunner);
    return {
      status: true,
      message: `Purchase #${purchaseId} completed successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in completePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to complete purchase",
      data: null,
    };
  }
};