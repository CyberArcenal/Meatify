// src/main/ipc/core/purchaseItem/search.ipc.js
const purchaseItemService = require("../../../../services/PurchaseItem");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, purchaseId, meatId, minQuantity, maxQuantity, expiryDateFrom, expiryDateTo, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      purchaseId,
      meatId,
      minQuantity,
      maxQuantity,
      expiryDateFrom,
      expiryDateTo,
      ...filters,
    };

    const result = await purchaseItemService.findAll(options);
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