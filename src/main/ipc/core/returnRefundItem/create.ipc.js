// src/main/ipc/core/returnRefundItem/create.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.returnRefundId) {
    return { status: false, message: "returnRefundId is required", data: null };
  }
  if (!data.meatId) {
    return { status: false, message: "meatId is required", data: null };
  }
  if (!data.batchId) {
    return { status: false, message: "batchId is required", data: null };
  }
  if (!data.weightKg || data.weightKg <= 0) {
    return { status: false, message: "weightKg must be greater than 0", data: null };
  }
  if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice < 0) {
    return { status: false, message: "unitPrice must be non-negative", data: null };
  }

  try {
    const result = await returnRefundItemService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Return refund item created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createItem:", error);
    return {
      status: false,
      message: error.message || "Failed to create return refund item",
      data: null,
    };
  }
};