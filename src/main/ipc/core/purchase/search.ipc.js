// src/main/ipc/core/purchase/search.ipc.js
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, supplierId, status, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      supplierId,
      status,
      startDate,
      endDate,
      ...filters,
    };

    const result = await purchaseService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchPurchases:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};