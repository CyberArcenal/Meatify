// src/main/ipc/core/returnRefundItem/export.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await returnRefundItemService.exportItems(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportItems:", error);
    return {
      status: false,
      message: error.message || "Failed to export return refund items",
      data: null,
    };
  }
};