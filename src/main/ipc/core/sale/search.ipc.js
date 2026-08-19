// src/main/ipc/core/sale/search.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, customerId, status, paymentMethod, startDate, endDate, minAmount, maxAmount, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      customerId,
      status,
      paymentMethod,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      ...filters,
    };

    const result = await saleService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchSales:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};