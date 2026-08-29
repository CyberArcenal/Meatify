// src/main/ipc/core/returnRefund/search.ipc.js
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, saleId, customerId, status, refundMethod, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      saleId,
      customerId,
      status,
      refundMethod,
      startDate,
      endDate,
      ...filters,
    };

    const result = await returnRefundService.findAll(options);
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
    console.error("Error in searchReturns:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};