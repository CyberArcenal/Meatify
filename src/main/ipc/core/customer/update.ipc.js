// src/main/ipc/core/customer/update.ipc.js
const customerService = require("../../../../services/Customer");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  // Prevent updating loyalty points through this endpoint
  if (data.loyaltyPointsBalance !== undefined || data.lifetimePointsEarned !== undefined) {
    return { 
      status: false, 
      message: "Use earnPoints, redeemPoints, or adjustPoints endpoints for loyalty updates", 
      data: null 
    };
  }

  try {
    const result = await customerService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Customer updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to update customer",
      data: null,
    };
  }
};