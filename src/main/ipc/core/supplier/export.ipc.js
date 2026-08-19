// src/main/ipc/core/supplier/export.ipc.js
const supplierService = require("../../../../services/Supplier");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await supplierService.exportSuppliers(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportSuppliers:", error);
    return {
      status: false,
      message: error.message || "Failed to export suppliers",
      data: null,
    };
  }
};