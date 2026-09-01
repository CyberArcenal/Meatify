// src/main/ipc/core/purchase/restore.ipc.js
//@ts-check
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid purchase ID is required", data: null };
  }

  try {
    // Purchase restore would set status back to pending if cancelled
    const result = await purchaseService.update(
      id,
      { status: "pending" },
      user,
      queryRunner
    );
    return {
      status: true,
      message: "Purchase restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restorePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to restore purchase",
      data: null,
    };
  }
};