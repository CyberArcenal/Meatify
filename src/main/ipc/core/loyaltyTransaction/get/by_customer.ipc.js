// src/main/ipc/core/loyaltyTransaction/get/by_customer.ipc.js
const loyaltyTransactionService = require("../../../../../services/LoyaltyTransaction");

module.exports = async (params) => {
  const { customerId, page, limit, includeDeleted = false } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const options = {
      customerId,
      page,
      limit,
      includeDeleted,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await loyaltyTransactionService.findAll(options);
    return {
      status: true,
      message: "Loyalty transactions retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getTransactionsByCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve loyalty transactions by customer",
      data: null,
    };
  }
};