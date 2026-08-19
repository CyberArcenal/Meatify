// src/main/ipc/core/saleItem/search.ipc.js
const saleItemService = require("../../../../services/SaleItem");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, saleId, meatId, batchId, minWeight, maxWeight, minAmount, maxAmount, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      saleId,
      meatId,
      batchId,
      minWeight,
      maxWeight,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      ...filters,
    };

    const result = await saleItemService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchItems:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};