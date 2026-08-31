// src/main/ipc/core/customer/get_loyalty_summary.ipc.js
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params) => {
  const { customerId } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const result = await loyaltyTransactionService.getCustomerLoyaltySummary(customerId);
    return {
      status: true,
      message: "Loyalty summary retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getCustomerSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve loyalty summary",
      data: null,
    };
  }
};