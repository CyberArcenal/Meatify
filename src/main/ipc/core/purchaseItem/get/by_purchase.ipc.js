// src/main/ipc/core/purchaseItem/get/by_purchase.ipc.js
const purchaseItemService = require("../../../../../services/PurchaseItem");

module.exports = async (params) => {
  const { purchaseId, page, limit } = params;

  if (!purchaseId || typeof purchaseId !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const options = {
      purchaseId,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "ASC",
    };
    const result = await purchaseItemService.findAll(options);
    return {
      status: true,
      message: "Purchase items retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getItemsByPurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase items by purchase",
      data: null,
    };
  }
};