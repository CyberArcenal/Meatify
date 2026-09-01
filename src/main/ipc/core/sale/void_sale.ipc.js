// src/main/ipc/core/sale/void_sale.ipc.js
//@ts-check
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { saleId, reason = "", user = "system" } = params;

  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const result = await saleService.voidSale(saleId, reason, user, queryRunner);
    return {
      status: true,
      message: `Sale #${saleId} voided successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in voidSale:", error);
    return {
      status: false,
      message: error.message || "Failed to void sale",
      data: null,
    };
  }
};