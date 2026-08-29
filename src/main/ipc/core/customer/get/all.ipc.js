// src/main/ipc/core/customer/get/all.ipc.js
const customerService = require("../../../../../services/Customer");

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

    const result = await customerService.findAll(options);
    return {
      status: true,
      message: "Customers retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve customers",
      data: null,
    };
  }
};