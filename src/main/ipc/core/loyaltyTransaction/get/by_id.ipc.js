// src/main/ipc/core/loyaltyTransaction/get/by_id.ipc.js
const loyaltyTransactionService = require("../../../../../services/LoyaltyTransaction");

module.exports = async (params) => {
  const { id, includeDeleted = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid transaction ID is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.findById(id, includeDeleted);
    return {
      status: true,
      message: "Loyalty transaction retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getTransactionById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve loyalty transaction",
      data: null,
    };
  }
};