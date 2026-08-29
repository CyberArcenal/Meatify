// src/main/ipc/core/sale/get/by_date_range.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async (params) => {
  const { startDate, endDate, status, page, limit } = params;

  if (!startDate) {
    return { status: false, message: "startDate is required", data: null };
  }
  if (!endDate) {
    return { status: false, message: "endDate is required", data: null };
  }

  try {
    const options = {
      startDate,
      endDate,
      status,
      page,
      limit,
      sortBy: "timestamp",
      sortOrder: "DESC",
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
    console.error("Error in getSalesByDateRange:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales by date range",
      data: null,
    };
  }
};