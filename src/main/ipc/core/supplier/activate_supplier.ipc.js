// src/main/ipc/core/supplier/activate_supplier.ipc.js
const { SupplierStateService } = require("../../../../stateServices/Supplier");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { supplierId, user = "system" } = params;

  if (!supplierId || typeof supplierId !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const stateService = new SupplierStateService(AppDataSource);
    const result = await stateService.activate(supplierId, user, queryRunner);
    return {
      status: true,
      message: `Supplier #${supplierId} activated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in activateSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to activate supplier",
      data: null,
    };
  }
};