// src/main/ipc/core/returnRefund/get/statistics.ipc.js
const returnRefundService = require("../../../../../services/ReturnRefund");

module.exports = async () => {
  try {
    const result = await returnRefundService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getReturnStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};