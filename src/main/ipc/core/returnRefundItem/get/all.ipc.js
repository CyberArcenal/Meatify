// src/main/ipc/core/returnRefundItem/get/all.ipc.js
const returnRefundItemService = require("../../../../../services/ReturnRefundItem");

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

    const result = await returnRefundItemService.findAll(options);
    return {
      status: true,
      message: "Return refund items retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllItems:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund items",
      data: null,
    };
  }
};