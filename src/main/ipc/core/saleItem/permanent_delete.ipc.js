// src/main/ipc/core/saleItem/permanent_delete.ipc.js
const saleItemService = require("../../../../services/SaleItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    await saleItemService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Sale item permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteItem:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete sale item",
      data: null,
    };
  }
};