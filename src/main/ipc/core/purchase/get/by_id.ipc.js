// src/main/ipc/core/purchase/get/by_id.ipc.js
const purchaseService = require("../../../../../services/Purchase");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const result = await purchaseService.findById(id);
    return {
      status: true,
      message: "Purchase retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getPurchaseById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase",
      data: null,
    };
  }
};