// src/main/ipc/core/returnRefundItem/get/statistics.ipc.js
const returnRefundItemService = require("../../../../../services/ReturnRefundItem");

module.exports = async () => {
  try {
    const result = await returnRefundItemService.getStatistics();
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