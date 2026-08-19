// src/main/ipc/core/sale/get/by_customer.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async (params) => {
  const { customerId, status, page, limit } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const options = {
      customerId,
      status,
      page,
      limit,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await saleService.findAll(options);
    return {
      status: true,
      message: "Sales retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getSalesByCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales by customer",
      data: null,
    };
  }
};