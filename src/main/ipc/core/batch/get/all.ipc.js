// src/main/ipc/core/batch/get/all.ipc.js
const batchService = require("../../../../../services/Batch");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;
  console.log("[Batch getAll] Received params:", params); // ✅

  try {
    const options = { page, limit, sortBy, sortOrder, ...filters };
    console.log("[Batch getAll] Options:", options); // ✅

    const result = await batchService.findAll(options);
    console.log("[Batch getAll] Result data count:", result.data.length); // ✅

    return {
      status: true,
      message: "Batches retrieved successfully",
      data: {
        items: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.pages,
      },
    };
  } catch (error) {
    console.error("Error in getAllBatches:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve batches",
      data: null,
    };
  }
};