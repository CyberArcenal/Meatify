// src/main/ipc/core/returnRefund/cancel_return.ipc.js
const { ReturnRefundStateService } = require("../../../../stateServices/ReturnRefund");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { returnId, reason = "", user = "system" } = params;

  if (!returnId || typeof returnId !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    const stateService = new ReturnRefundStateService(AppDataSource);
    const result = await stateService.cancelReturn(returnId, reason, user, queryRunner);
    return {
      status: true,
      message: `Return #${returnId} cancelled successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in cancelReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to cancel return",
      data: null,
    };
  }
};