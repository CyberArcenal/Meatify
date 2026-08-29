// src/main/ipc/core/supplier/get/all.ipc.js
const supplierService = require("../../../../../services/Supplier");

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

    const result = await supplierService.findAll(options);
    return {
      status: true,
      message: "Suppliers retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getAllSuppliers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve suppliers",
      data: null,
    };
  }
};