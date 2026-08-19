// src/main/ipc/core/returnRefundItem/get/by_return.ipc.js
const returnRefundItemService = require("../../../../../services/ReturnRefundItem");

module.exports = async (params) => {
  const { returnRefundId, page, limit } = params;

  if (!returnRefundId || typeof returnRefundId !== "number") {
    return { status: false, message: "Valid return refund ID is required", data: null };
  }

  try {
    const options = {
      returnRefundId,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "ASC",
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
    console.error("Error in getItemsByReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund items by return",
      data: null,
    };
  }
};