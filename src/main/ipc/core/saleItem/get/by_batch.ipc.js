// src/main/ipc/core/saleItem/get/by_batch.ipc.js
const saleItemService = require("../../../../../services/SaleItem");

module.exports = async (params) => {
  const { batchId, page, limit } = params;

  if (!batchId || typeof batchId !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const options = {
      batchId,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
    };
    const result = await saleItemService.findAll(options);
    return {
      status: true,
      message: "Sale items retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getItemsByBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sale items by batch",
      data: null,
    };
  }
};