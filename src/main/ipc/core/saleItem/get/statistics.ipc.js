// src/main/ipc/core/saleItem/get/statistics.ipc.js
const saleItemService = require("../../../../../services/SaleItem");

module.exports = async () => {
  try {
    const result = await saleItemService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getItemStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};