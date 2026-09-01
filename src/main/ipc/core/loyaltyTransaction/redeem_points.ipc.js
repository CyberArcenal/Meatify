// src/main/ipc/core/loyaltyTransaction/redeem_points.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { customerId, pointsToRedeem, saleId, user = "system" } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }
  if (!pointsToRedeem || pointsToRedeem <= 0) {
    return { status: false, message: "pointsToRedeem must be greater than 0", data: null };
  }
  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.redeemPoints(
      customerId,
      pointsToRedeem,
      saleId,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `${result.pointsRedeemed} points redeemed for customer #${customerId}`,
      data: {
        customer: result.customer,
        transaction: result.transaction,
        pointsRedeemed: result.pointsRedeemed,
      },
    };
  } catch (error) {
    console.error("Error in redeemPoints:", error);
    return {
      status: false,
      message: error.message || "Failed to redeem points",
      data: null,
    };
  }
};