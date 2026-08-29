// src/main/ipc/core/customer/get/active.ipc.js
const customerService = require("../../../../../services/Customer");

module.exports = async () => {
  try {
    const options = {
      isActive: true,
      sortBy: "name",
      sortOrder: "ASC",
    };
    const result = await customerService.findAll(options);
    return {
      status: true,
      message: "Active customers retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getActiveCustomers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve active customers",
      data: null,
    };
  }
};