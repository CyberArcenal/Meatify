// src/main/ipc/core/loyaltyTransaction/restore.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid transaction ID is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Loyalty transaction restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreTransaction:", error);
    return {
      status: false,
      message: error.message || "Failed to restore loyalty transaction",
      data: null,
    };
  }
};