// src/main/ipc/core/loyaltyTransaction/get/statistics.ipc.js
const loyaltyTransactionService = require("../../../../../services/LoyaltyTransaction");

module.exports = async () => {
  try {
    const result = await loyaltyTransactionService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getTransactionStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};