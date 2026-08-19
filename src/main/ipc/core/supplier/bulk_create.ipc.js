// src/main/ipc/core/supplier/bulk_create.ipc.js
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { suppliersArray, user = "system" } = params;

  if (!Array.isArray(suppliersArray) || suppliersArray.length === 0) {
    return {
      status: false,
      message: "suppliersArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await supplierService.bulkCreate(suppliersArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateSuppliers:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};