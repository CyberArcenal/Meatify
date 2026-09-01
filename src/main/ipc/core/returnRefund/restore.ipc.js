// src/main/ipc/core/returnRefund/restore.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    // Restore would set status back to pending if cancelled
    const result = await returnRefundService.update(
      id,
      { status: "pending" },
      user,
      queryRunner
    );
    return {
      status: true,
      message: "Return restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to restore return",
      data: null,
    };
  }
};