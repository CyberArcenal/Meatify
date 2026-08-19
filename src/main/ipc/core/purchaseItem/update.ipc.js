// src/main/ipc/core/purchaseItem/update.ipc.js
const purchaseItemService = require("../../../../services/PurchaseItem");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  // Prevent updating purchase or meat
  if (data.purchaseId !== undefined || data.meatId !== undefined) {
    return {
      status: false,
      message: "Cannot change purchaseId or meatId after creation",
      data: null,
    };
  }

  try {
    const result = await purchaseItemService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Purchase item updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateItem:", error);
    return {
      status: false,
      message: error.message || "Failed to update purchase item",
      data: null,
    };
  }
};