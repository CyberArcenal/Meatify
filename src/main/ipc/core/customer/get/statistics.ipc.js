// src/main/ipc/core/customer/get/statistics.ipc.js
const customerService = require("../../../../../services/Customer");

module.exports = async () => {
  try {
    const result = await customerService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getCustomerStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};