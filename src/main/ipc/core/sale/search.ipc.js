// src/main/ipc/core/sale/search.ipc.js
//@ts-check
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
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
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