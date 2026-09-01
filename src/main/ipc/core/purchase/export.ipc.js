// src/main/ipc/core/purchase/export.ipc.js
//@ts-check
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await purchaseService.exportPurchases(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportPurchases:", error);
    return {
      status: false,
      message: error.message || "Failed to export purchases",
      data: null,
    };
  }
};