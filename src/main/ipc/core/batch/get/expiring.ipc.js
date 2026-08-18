// src/main/ipc/core/batch/get/expiring.ipc.js
const batchService = require("../../../../../services/BatchService");

module.exports = async (params) => {
  const { daysThreshold = 7 } = params;

  try {
    const today = new Date();
    const expiryDateTo = new Date();
    expiryDateTo.setDate(expiryDateTo.getDate() + daysThreshold);

    const options = {
      status: "active",
      expiryDateFrom: today.toISOString().split("T")[0],
      expiryDateTo: expiryDateTo.toISOString().split("T")[0],
      sortBy: "expiryDate",
      sortOrder: "ASC",
    };

    const result = await batchService.findAll(options);
    return {
      status: true,
      message: `Expiring batches retrieved successfully (within ${daysThreshold} days)`,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getExpiringBatches:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve expiring batches",
      data: null,
    };
  }
};