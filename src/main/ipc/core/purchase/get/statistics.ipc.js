// src/main/ipc/core/purchase/get/statistics.ipc.js
const purchaseService = require("../../../../../services/Purchase");

module.exports = async () => {
  try {
    const result = await purchaseService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getPurchaseStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};