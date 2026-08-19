// src/main/ipc/core/batch/get/active.ipc.js
const batchService = require("../../../../../services/Batch");

module.exports = async (params) => {
  const { meatId } = params;

  try {
    const options = {
      meatId,
      status: "active",
      sortBy: "expiryDate",
      sortOrder: "ASC",
    };
    const result = await batchService.findAll(options);
    return {
      status: true,
      message: "Active batches retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getActiveBatches:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve active batches",
      data: null,
    };
  }
};