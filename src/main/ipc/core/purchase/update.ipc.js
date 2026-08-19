// src/main/ipc/core/purchase/update.ipc.js
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    const result = await purchaseService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Purchase updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updatePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to update purchase",
      data: null,
    };
  }
};