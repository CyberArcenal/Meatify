// src/main/ipc/core/loyaltyTransaction/delete.ipc.js
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid transaction ID is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Loyalty transaction deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteTransaction:", error);
    return {
      status: false,
      message: error.message || "Failed to delete loyalty transaction",
      data: null,
    };
  }
};