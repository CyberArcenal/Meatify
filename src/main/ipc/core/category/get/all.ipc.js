// src/main/ipc/core/category/get/all.ipc.js
const categoryService = require("../../../../../services/CategoryService");

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
        data: result.data,
        pagination: result.pagination,
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