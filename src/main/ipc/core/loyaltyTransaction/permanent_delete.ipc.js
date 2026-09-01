// src/main/ipc/core/loyaltyTransaction/permanent_delete.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid transaction ID is required", data: null };
  }

  try {
    await loyaltyTransactionService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Loyalty transaction permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteTransaction:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete loyalty transaction",
      data: null,
    };
  }
};