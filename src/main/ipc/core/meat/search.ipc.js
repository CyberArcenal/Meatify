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
        data: result.data,
        pagination: result.pagination,
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