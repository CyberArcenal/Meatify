// src/main/ipc/core/sale/get/by_customer.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async (params) => {
  const { customerId, status, page, limit } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const options = {
      customerId,
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
    console.error("Error in getSalesByCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales by customer",
      data: null,
    };
  }
};