// src/main/ipc/core/returnRefundItem/update.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  // Prevent updating returnRefund, meat, or batch
  if (data.returnRefundId !== undefined || data.meatId !== undefined || data.batchId !== undefined) {
    return {
      status: false,
      message: "Cannot change returnRefundId, meatId, or batchId after creation",
      data: null,
    };
  }

  try {
    const result = await returnRefundItemService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Return refund item updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateItem:", error);
    return {
      status: false,
      message: error.message || "Failed to update return refund item",
      data: null,
    };
  }
};