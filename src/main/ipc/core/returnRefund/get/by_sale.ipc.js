// src/main/ipc/core/returnRefund/get/by_sale.ipc.js
const returnRefundService = require("../../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { saleId, page, limit } = params;

  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const options = {
      saleId,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
    };
    const result = await returnRefundService.findAll(options);
    return {
      status: true,
      message: "Returns retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getReturnsBySale:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve returns by sale",
      data: null,
    };
  }
};