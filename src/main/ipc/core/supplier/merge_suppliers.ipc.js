// src/main/ipc/core/supplier/merge_suppliers.ipc.js
const { SupplierStateService } = require("../../../../stateServices/SupplierStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { sourceSupplierId, targetSupplierId, user = "system" } = params;

  if (!sourceSupplierId || typeof sourceSupplierId !== "number") {
    return { status: false, message: "Valid source supplier ID is required", data: null };
  }
  if (!targetSupplierId || typeof targetSupplierId !== "number") {
    return { status: false, message: "Valid target supplier ID is required", data: null };
  }

  try {
    const stateService = new SupplierStateService(AppDataSource);
    const result = await stateService.mergeSuppliers(
      sourceSupplierId,
      targetSupplierId,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `Supplier #${sourceSupplierId} merged into #${targetSupplierId} successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in mergeSuppliers:", error);
    return {
      status: false,
      message: error.message || "Failed to merge suppliers",
      data: null,
    };
  }
};