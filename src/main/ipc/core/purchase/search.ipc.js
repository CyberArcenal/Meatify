// src/main/ipc/core/purchase/search.ipc.js
//@ts-check
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
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
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