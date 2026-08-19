// src/main/ipc/core/loyaltyTransaction/search.ipc.js
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
        data: result.data,
        pagination: result.pagination,
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