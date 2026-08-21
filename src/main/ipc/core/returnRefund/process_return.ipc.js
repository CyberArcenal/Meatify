// src/main/ipc/core/returnRefund/process_return.ipc.js
const { ReturnRefundStateService } = require("../../../../stateServices/ReturnRefund");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { returnId, user = "system" } = params;

  if (!returnId || typeof returnId !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    const stateService = new ReturnRefundStateService(AppDataSource);
    const result = await stateService.processReturn(returnId, user, queryRunner);
    return {
      status: true,
      message: `Return #${returnId} processed successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in processReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to process return",
      data: null,
    };
  }
};