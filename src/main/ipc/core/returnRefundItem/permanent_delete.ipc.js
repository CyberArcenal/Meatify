// src/main/ipc/core/returnRefundItem/permanent_delete.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    await returnRefundItemService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Return refund item permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteItem:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete return refund item",
      data: null,
    };
  }
};