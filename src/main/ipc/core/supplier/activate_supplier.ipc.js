// src/main/ipc/core/supplier/activate_supplier.ipc.js
//@ts-check
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { supplierId, user = "system" } = params;

  if (!supplierId || typeof supplierId !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    // ✅ Tama: Use SupplierService (not State Service)
    const result = await supplierService.activate(supplierId, user, queryRunner);
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