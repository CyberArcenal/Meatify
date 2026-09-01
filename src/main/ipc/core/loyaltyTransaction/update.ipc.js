// src/main/ipc/core/loyaltyTransaction/update.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid transaction ID is required", data: null };
  }

  // Only allow updating notes
  if (data.pointsChange !== undefined || data.transactionType !== undefined ||
      data.customerId !== undefined || data.saleId !== undefined) {
    return {
      status: false,
      message: "Cannot update pointsChange, transactionType, customerId, or saleId",
      data: null,
    };
  }

  try {
    const result = await loyaltyTransactionService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Loyalty transaction updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateTransaction:", error);
    return {
      status: false,
      message: error.message || "Failed to update loyalty transaction",
      data: null,
    };
  }
};