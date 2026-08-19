// src/main/ipc/core/purchase/create.ipc.js
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.supplierId) {
    return { status: false, message: "supplierId is required", data: null };
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { status: false, message: "At least one purchase item is required", data: null };
  }

  // Validate each item has required fields
  for (const item of data.items) {
    if (!item.productId && !item.meatId) {
      return { status: false, message: "productId or meatId is required for each item", data: null };
    }
    if (!item.quantity || item.quantity <= 0) {
      return { status: false, message: "quantity must be greater than 0 for each item", data: null };
    }
    if (!item.unitPrice || item.unitPrice < 0) {
      return { status: false, message: "unitPrice must be non-negative for each item", data: null };
    }
    if (!item.expiryDate) {
      return { status: false, message: "expiryDate is required for each item", data: null };
    }
  }

  try {
    const result = await purchaseService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Purchase created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createPurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to create purchase",
      data: null,
    };
  }
};