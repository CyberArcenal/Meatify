// src/main/ipc/core/supplier/create.ipc.js
const supplierService = require("../../../../services/Supplier");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.name) {
    return { status: false, message: "Supplier name is required", data: null };
  }

  try {
    const result = await supplierService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Supplier created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to create supplier",
      data: null,
    };
  }
};