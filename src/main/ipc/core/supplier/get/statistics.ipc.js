// src/main/ipc/core/supplier/get/statistics.ipc.js
const supplierService = require("../../../../../services/Supplier");

module.exports = async () => {
  try {
    const result = await supplierService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getSupplierStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};