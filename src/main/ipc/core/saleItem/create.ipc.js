// src/main/ipc/core/saleItem/create.ipc.js
const saleItemService = require("../../../../services/SaleItem");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.saleId) {
    return { status: false, message: "saleId is required", data: null };
  }
  if (!data.meatId) {
    return { status: false, message: "meatId is required", data: null };
  }
  if (!data.batchId) {
    return { status: false, message: "batchId is required", data: null };
  }
  if (!data.weightKg || data.weightKg <= 0) {
    return { status: false, message: "weightKg must be greater than 0", data: null };
  }
  if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice < 0) {
    return { status: false, message: "unitPrice must be non-negative", data: null };
  }

  try {
    const result = await saleItemService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Sale item created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createItem:", error);
    return {
      status: false,
      message: error.message || "Failed to create sale item",
      data: null,
    };
  }
};