// src/main/ipc/core/sale/get/statistics.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async () => {
  try {
    const result = await saleService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getSaleStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};