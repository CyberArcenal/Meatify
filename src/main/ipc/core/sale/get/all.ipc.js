// src/main/ipc/core/sale/get/all.ipc.js
const saleService = require("../../../../../services/Sale");

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
    console.error("Error in getAllSales:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales",
      data: null,
    };
  }
};