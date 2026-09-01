// src/main/ipc/core/supplier/permanent_delete.ipc.js
//@ts-check
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    await supplierService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Supplier permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete supplier",
      data: null,
    };
  }
};