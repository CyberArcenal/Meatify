// src/main/ipc/core/loyaltyTransaction/search.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, customerId, saleId, transactionType, direction, startDate, endDate, minPoints, maxPoints, includeDeleted, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      customerId,
      saleId,
      transactionType,
      direction,
      startDate,
      endDate,
      minPoints,
      maxPoints,
      includeDeleted,
      ...filters,
    };

    const result = await loyaltyTransactionService.findAll(options);
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
    console.error("Error in searchTransactions:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};