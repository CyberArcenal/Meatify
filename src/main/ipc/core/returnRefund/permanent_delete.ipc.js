// src/main/ipc/core/returnRefund/permanent_delete.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    await returnRefundService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Return permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete return",
      data: null,
    };
  }
};