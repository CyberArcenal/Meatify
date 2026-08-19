// src/main/ipc/core/returnRefundItem/get/by_id.ipc.js
const returnRefundItemService = require("../../../../../services/ReturnRefundItem");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    const result = await returnRefundItemService.findById(id);
    return {
      status: true,
      message: "Return refund item retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getItemById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund item",
      data: null,
    };
  }
};