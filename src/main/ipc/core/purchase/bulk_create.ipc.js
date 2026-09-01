// src/main/ipc/core/purchase/bulk_create.ipc.js
//@ts-check
const purchaseService = require("../../../../services/Purchase");

module.exports = async (params, queryRunner) => {
  const { purchasesArray, user = "system" } = params;

  if (!Array.isArray(purchasesArray) || purchasesArray.length === 0) {
    return {
      status: false,
      message: "purchasesArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await purchaseService.bulkCreate(purchasesArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreatePurchases:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};