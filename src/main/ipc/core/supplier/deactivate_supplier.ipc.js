// src/main/ipc/core/supplier/deactivate_supplier.ipc.js
const { SupplierStateService } = require("../../../../stateServices/SupplierStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { 
    supplierId, 
    reassignToSupplierId, 
    allowWithPendingPurchases = false,
    user = "system" 
  } = params;

  if (!supplierId || typeof supplierId !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const stateService = new SupplierStateService(AppDataSource);
    const result = await stateService.deactivate(
      supplierId,
      { reassignToSupplierId, allowWithPendingPurchases },
      user,
      queryRunner
    );
    return {
      status: true,
      message: `Supplier #${supplierId} deactivated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in deactivateSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate supplier",
      data: null,
    };
  }
};