// src/main/ipc/core/loyaltyTransaction/earn_points.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { customerId, amountSpent, saleId, user = "system" } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }
  if (!amountSpent || amountSpent <= 0) {
    return { status: false, message: "amountSpent must be greater than 0", data: null };
  }
  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.earnPoints(
      customerId,
      amountSpent,
      saleId,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `${result.pointsEarned} points earned for customer #${customerId}`,
      data: {
        customer: result.customer,
        transaction: result.transaction,
        pointsEarned: result.pointsEarned,
      },
    };
  } catch (error) {
    console.error("Error in earnPoints:", error);
    return {
      status: false,
      message: error.message || "Failed to earn points",
      data: null,
    };
  }
};