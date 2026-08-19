// src/main/ipc/core/saleItem/export.ipc.js
const saleItemService = require("../../../../services/SaleItem");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await saleItemService.exportItems(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportItems:", error);
    return {
      status: false,
      message: error.message || "Failed to export sale items",
      data: null,
    };
  }
};