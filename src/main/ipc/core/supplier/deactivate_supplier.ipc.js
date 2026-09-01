// src/main/ipc/core/supplier/deactivate_supplier.ipc.js
//@ts-check
const supplierService = require("../../../../services/Supplier");

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
    // ✅ Tama: Use SupplierService (not State Service)
    const result = await supplierService.deactivate(
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