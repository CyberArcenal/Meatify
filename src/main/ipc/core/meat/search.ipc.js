// src/main/ipc/core/meat/search.ipc.js
const meatService = require("../../../../services/Meat");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, isActive, categoryId, supplierId, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      isActive,
      categoryId,
      supplierId,
      ...filters,
    };

    const result = await meatService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in searchMeats:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};