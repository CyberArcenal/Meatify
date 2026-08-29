// src/main/ipc/core/returnRefundItem/search.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, returnRefundId, meatId, batchId, minWeight, maxWeight, minAmount, maxAmount, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      returnRefundId,
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

    const result = await returnRefundItemService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
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