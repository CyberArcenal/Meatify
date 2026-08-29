// src/main/ipc/core/supplier/get/active.ipc.js
const supplierService = require("../../../../../services/Supplier");

module.exports = async () => {
  try {
    const options = {
      isActive: true,
      sortBy: "name",
      sortOrder: "ASC",
    };
    const result = await supplierService.findAll(options);
    return {
      status: true,
      message: "Active suppliers retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getActiveSuppliers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve active suppliers",
      data: null,
    };
  }
};