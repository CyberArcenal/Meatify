// src/main/ipc/core/loyaltyTransaction/get/by_sale.ipc.js
const loyaltyTransactionService = require("../../../../../services/LoyaltyTransaction");

module.exports = async (params) => {
  const { saleId, page, limit, includeDeleted = false } = params;

  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const options = {
      saleId,
      page,
      limit,
      includeDeleted,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await loyaltyTransactionService.findAll(options);
    return {
      status: true,
      message: "Loyalty transactions retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getTransactionsBySale:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve loyalty transactions by sale",
      data: null,
    };
  }
};