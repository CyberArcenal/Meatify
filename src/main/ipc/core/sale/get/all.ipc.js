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
      ...filters,   // includes search, paymentMethod, status, startDate, endDate, customerId, etc.
    };

    const result = await saleService.findAll(options);
    return {
      status: true,
      message: "Sales retrieved successfully",
      data: {
        items: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.pages,
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