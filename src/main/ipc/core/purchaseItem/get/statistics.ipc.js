// src/main/ipc/core/purchaseItem/get/statistics.ipc.js
const purchaseItemService = require("../../../../../services/PurchaseItem");

module.exports = async () => {
  try {
    const result = await purchaseItemService.getStatistics();
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