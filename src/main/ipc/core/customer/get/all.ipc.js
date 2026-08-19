// src/main/ipc/core/customer/get/all.ipc.js
const customerService = require("../../../../../services/Customer");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    };

    const result = await customerService.findAll(options);
    return {
      status: true,
      message: "Customers retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve customers",
      data: null,
    };
  }
};