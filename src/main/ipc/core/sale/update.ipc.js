// src/main/ipc/core/sale/update.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const result = await saleService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Sale updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateSale:", error);
    return {
      status: false,
      message: error.message || "Failed to update sale",
      data: null,
    };
  }
};