// src/main/ipc/core/sale/get/all.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    };

    const result = await saleService.findAll(options);
    return {
      status: true,
      message: "Sales retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getAllSales:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales",
      data: null,
    };
  }
};