// src/main/ipc/core/returnRefund/delete.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    const result = await returnRefundService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Return cancelled successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to cancel return",
      data: null,
    };
  }
};