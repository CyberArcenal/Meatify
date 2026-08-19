// src/main/ipc/core/category/search.ipc.js
const categoryService = require("../../../../services/Category");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, isActive, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      isActive,
      ...filters,
    };

    const result = await categoryService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchCategories:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};