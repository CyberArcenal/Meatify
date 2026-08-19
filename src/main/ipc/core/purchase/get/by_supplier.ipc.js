// src/main/ipc/core/purchase/get/by_supplier.ipc.js
const purchaseService = require("../../../../../services/Purchase");

module.exports = async (params) => {
  const { supplierId, status, page, limit } = params;

  if (!supplierId || typeof supplierId !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }

  try {
    const options = {
      supplierId,
      status,
      page,
      limit,
      sortBy: "orderDate",
      sortOrder: "DESC",
    };
    const result = await purchaseService.findAll(options);
    return {
      status: true,
      message: "Purchases retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getPurchasesBySupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchases by supplier",
      data: null,
    };
  }
};