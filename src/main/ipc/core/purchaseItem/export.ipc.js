// src/main/ipc/core/purchaseItem/export.ipc.js
const purchaseItemService = require("../../../../services/PurchaseItem");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await purchaseItemService.exportItems(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportItems:", error);
    return {
      status: false,
      message: error.message || "Failed to export purchase items",
      data: null,
    };
  }
};