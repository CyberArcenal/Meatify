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
        data: result.data,
        pagination: result.pagination,
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