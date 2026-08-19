// src/main/ipc/core/purchaseItem/get/by_id.ipc.js
const purchaseItemService = require("../../../../../services/PurchaseItem");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    const result = await purchaseItemService.findById(id);
    return {
      status: true,
      message: "Purchase item retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getItemById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase item",
      data: null,
    };
  }
};