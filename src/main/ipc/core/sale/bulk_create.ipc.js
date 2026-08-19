// src/main/ipc/core/sale/bulk_create.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { salesArray, user = "system" } = params;

  if (!Array.isArray(salesArray) || salesArray.length === 0) {
    return {
      status: false,
      message: "salesArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await saleService.bulkCreate(salesArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateSales:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};