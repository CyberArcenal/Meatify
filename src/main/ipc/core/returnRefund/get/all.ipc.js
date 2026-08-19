// src/main/ipc/core/returnRefund/get/all.ipc.js
const returnRefundService = require("../../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
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
    console.error("Error in getAllReturns:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve returns",
      data: null,
    };
  }
};