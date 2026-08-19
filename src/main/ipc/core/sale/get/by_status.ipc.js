// src/main/ipc/core/sale/get/by_status.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async (params) => {
  const { status, page, limit } = params;

  if (!status) {
    return { status: false, message: "status is required", data: null };
  }

  try {
    const options = {
      status,
      page,
      limit,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await saleService.findAll(options);
    return {
      status: true,
      message: "Sales retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getSalesByStatus:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales by status",
      data: null,
    };
  }
};