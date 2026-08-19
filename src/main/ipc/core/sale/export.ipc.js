// src/main/ipc/core/sale/export.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await saleService.exportSales(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportSales:", error);
    return {
      status: false,
      message: error.message || "Failed to export sales",
      data: null,
    };
  }
};