// src/main/ipc/core/purchase/permanent_delete.ipc.js
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    await purchaseService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Purchase permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeletePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete purchase",
      data: null,
    };
  }
};