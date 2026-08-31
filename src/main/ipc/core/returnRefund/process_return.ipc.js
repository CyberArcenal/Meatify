// src/main/ipc/core/returnRefund/process_return.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { returnId, user = "system" } = params;

  if (!returnId || typeof returnId !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    // ✅ Tama: Use Service (not State Service)
    const result = await returnRefundService.processReturn(returnId, user, queryRunner);
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