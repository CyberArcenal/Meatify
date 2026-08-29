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