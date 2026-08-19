// src/main/ipc/core/returnRefundItem/delete.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    const result = await returnRefundItemService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Return refund item deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteItem:", error);
    return {
      status: false,
      message: error.message || "Failed to delete return refund item",
      data: null,
    };
  }
};