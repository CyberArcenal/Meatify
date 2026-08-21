// src/main/ipc/core/purchase/approve_purchase.ipc.js
const { PurchaseStateTransitionService } = require("../../../../stateServices/Purchase");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { purchaseId, user = "system" } = params;

  if (!purchaseId || typeof purchaseId !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const stateService = new PurchaseStateTransitionService(AppDataSource);
    const result = await stateService.onApprove(purchaseId, user, queryRunner);
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