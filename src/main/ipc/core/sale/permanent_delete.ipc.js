// src/main/ipc/core/sale/permanent_delete.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    await saleService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Sale permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteSale:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete sale",
      data: null,
    };
  }
};