// src/main/ipc/core/purchase/approve_purchase.ipc.js
//@ts-check
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { purchaseId, user = "system" } = params;

  if (!purchaseId || typeof purchaseId !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const result = await purchaseService.approve(purchaseId, user, queryRunner);
    return {
      status: true,
      message: `Purchase #${purchaseId} approved successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in approvePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to approve purchase",
      data: null,
    };
  }
};