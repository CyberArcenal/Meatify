// src/main/ipc/core/sale/delete.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    // Only allow deletion for initiated or voided sales
    const result = await saleService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Sale deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in deleteSale:", error);
    return {
      status: false,
      message: error.message || "Failed to delete sale",
      data: null,
    };
  }
};