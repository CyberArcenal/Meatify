// src/main/ipc/core/purchaseItem/create.ipc.js
const purchaseItemService = require("../../../../services/PurchaseItem");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.purchaseId) {
    return { status: false, message: "purchaseId is required", data: null };
  }
  if (!data.meatId) {
    return { status: false, message: "meatId is required", data: null };
  }
  if (!data.quantity || data.quantity <= 0) {
    return { status: false, message: "quantity must be greater than 0", data: null };
  }
  if (data.unitPrice === undefined || data.unitPrice === null || data.unitPrice < 0) {
    return { status: false, message: "unitPrice must be non-negative", data: null };
  }
  if (!data.expiryDate) {
    return { status: false, message: "expiryDate is required", data: null };
  }

  try {
    const result = await purchaseItemService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Purchase item created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createItem:", error);
    return {
      status: false,
      message: error.message || "Failed to create purchase item",
      data: null,
    };
  }
};