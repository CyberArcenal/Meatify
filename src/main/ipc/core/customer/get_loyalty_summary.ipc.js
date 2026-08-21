// src/main/ipc/core/customer/get_loyalty_summary.ipc.js
const { CustomerStateService } = require("../../../../stateServices/Customer");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params) => {
  const { customerId } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const stateService = new CustomerStateService(AppDataSource);
    const result = await stateService.getCustomerLoyaltySummary(customerId);
    return {
      status: true,
      message: "Loyalty summary retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getLoyaltySummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve loyalty summary",
      data: null,
    };
  }
};