// src/main/ipc/core/category/get/all.ipc.js
const categoryService = require("../../../../../services/Category");

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

    const result = await categoryService.findAll(options);
    return {
      status: true,
      message: "Categories retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve categories",
      data: null,
    };
  }
};