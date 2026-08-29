// src/main/ipc/core/batch/search.ipc.js
const batchService = require("../../../../services/Batch");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      ...filters,
    };

    const result = await batchService.findAll(options);
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
    console.error("Error in searchBatches:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};