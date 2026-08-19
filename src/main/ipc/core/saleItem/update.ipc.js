// src/main/ipc/core/saleItem/update.ipc.js
const saleItemService = require("../../../../services/SaleItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  // Prevent updating sale, meat, or batch
  if (data.saleId !== undefined || data.meatId !== undefined || data.batchId !== undefined) {
    return {
      status: false,
      message: "Cannot change saleId, meatId, or batchId after creation",
      data: null,
    };
  }

  try {
    const result = await saleItemService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Sale item updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateItem:", error);
    return {
      status: false,
      message: error.message || "Failed to update sale item",
      data: null,
    };
  }
};