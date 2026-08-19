// src/main/ipc/core/supplier/get/by_id.ipc.js
const supplierService = require("../../../../../services/Supplier");

module.exports = async (params) => {
  const { id, includeInactive = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const result = await supplierService.findById(id, includeInactive);
    return {
      status: true,
      message: "Supplier retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getSupplierById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve supplier",
      data: null,
    };
  }
};