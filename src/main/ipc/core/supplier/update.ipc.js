// src/main/ipc/core/supplier/update.ipc.js
//@ts-check
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const result = await supplierService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Supplier updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to update supplier",
      data: null,
    };
  }
};