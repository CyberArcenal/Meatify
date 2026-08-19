// src/main/ipc/core/sale/restore.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    // Restore would update status from voided back to initiated
    const result = await saleService.update(
      id,
      { status: "initiated" },
      user,
      queryRunner
    );
    return {
      status: true,
      message: "Sale restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreSale:", error);
    return {
      status: false,
      message: error.message || "Failed to restore sale",
      data: null,
    };
  }
};