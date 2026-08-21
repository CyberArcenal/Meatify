// src/main/ipc/core/loyaltyTransaction/get_customer_summary.ipc.js
const { LoyaltyTransactionStateService } = require("../../../../stateServices/LoyaltyTransaction");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params) => {
  const { customerId } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const stateService = new LoyaltyTransactionStateService(AppDataSource);
    const result = await stateService.getCustomerLoyaltySummary(customerId);
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