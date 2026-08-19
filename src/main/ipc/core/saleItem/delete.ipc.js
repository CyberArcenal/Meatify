// src/main/ipc/core/saleItem/delete.ipc.js
const saleItemService = require("../../../../services/SaleItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    const result = await saleItemService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Sale item deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteItem:", error);
    return {
      status: false,
      message: error.message || "Failed to delete sale item",
      data: null,
    };
  }
};