// src/main/ipc/core/purchaseItem/delete.ipc.js
const purchaseItemService = require("../../../../services/PurchaseItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    const result = await purchaseItemService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Purchase item deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteItem:", error);
    return {
      status: false,
      message: error.message || "Failed to delete purchase item",
      data: null,
    };
  }
};