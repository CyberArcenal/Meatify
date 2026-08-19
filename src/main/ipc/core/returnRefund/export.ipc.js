// src/main/ipc/core/returnRefund/export.ipc.js
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await returnRefundService.exportReturns(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportReturns:", error);
    return {
      status: false,
      message: error.message || "Failed to export returns",
      data: null,
    };
  }
};