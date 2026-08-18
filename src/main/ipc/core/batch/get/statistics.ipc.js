// src/main/ipc/core/batch/get/statistics.ipc.js
const batchService = require("../../../../../services/BatchService");

module.exports = async () => {
  try {
    const result = await batchService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getBatchStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};