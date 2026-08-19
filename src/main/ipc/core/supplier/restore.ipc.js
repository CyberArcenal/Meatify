// src/main/ipc/core/supplier/restore.ipc.js
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const result = await supplierService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Supplier restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to restore supplier",
      data: null,
    };
  }
};