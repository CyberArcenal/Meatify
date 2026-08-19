// src/main/ipc/core/loyaltyTransaction/create.ipc.js
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.customerId) {
    return { status: false, message: "customerId is required", data: null };
  }
  if (data.pointsChange === undefined || data.pointsChange === null || data.pointsChange === 0) {
    return { status: false, message: "pointsChange must be non-zero", data: null };
  }
  if (!data.transactionType) {
    return { status: false, message: "transactionType is required", data: null };
  }

  // Only allow 'adjustment' type for manual creation
  if (data.transactionType !== "adjustment") {
    return {
      status: false,
      message: "Only 'adjustment' transaction type is allowed. Use earnPoints, redeemPoints, or reverseTransaction for other types.",
      data: null,
    };
  }

  try {
    const result = await loyaltyTransactionService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Loyalty transaction created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createTransaction:", error);
    return {
      status: false,
      message: error.message || "Failed to create loyalty transaction",
      data: null,
    };
  }
};