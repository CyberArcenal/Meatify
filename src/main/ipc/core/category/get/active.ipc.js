// src/main/ipc/core/category/get/active.ipc.js
const categoryService = require("../../../../../services/Category");

module.exports = async (params) => {
  try {
    const options = {
      isActive: true,
      sortBy: "name",
      sortOrder: "ASC",
    };
    const result = await categoryService.findAll(options);
    return {
      status: true,
      message: "Active categories retrieved successfully",
       data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getActiveCategories:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve active categories",
      data: null,
    };
  }
};