// src/main/ipc/core/purchase/get/by_status.ipc.js
const purchaseService = require("../../../../../services/Purchase");

module.exports = async (params) => {
  const { status, page, limit } = params;

  if (!status) {
    return { status: false, message: "status is required", data: null };
  }

  try {
    const options = {
      status,
      page,
      limit,
      sortBy: "orderDate",
      sortOrder: "DESC",
    };
    const result = await purchaseService.findAll(options);
    return {
      status: true,
      message: "Purchases retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getPurchasesByStatus:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchases by status",
      data: null,
    };
  }
};