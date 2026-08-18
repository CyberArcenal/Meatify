// src/main/ipc/core/batch/get/all.ipc.js
const batchService = require("../../../../../services/BatchService");

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

    const result = await batchService.findAll(options);
    return {
      status: true,
      message: "Batches retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
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