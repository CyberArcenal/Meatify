// src/main/ipc/core/purchaseItem/permanent_delete.ipc.js
const purchaseItemService = require("../../../../services/PurchaseItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    await purchaseItemService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Purchase item permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteItem:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete purchase item",
      data: null,
    };
  }
};