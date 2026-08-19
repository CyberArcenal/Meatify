// src/main/ipc/core/supplier/delete.ipc.js
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const result = await supplierService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Supplier deactivated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate supplier",
      data: null,
    };
  }
};