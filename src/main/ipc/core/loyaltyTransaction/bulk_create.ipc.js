// src/main/ipc/core/loyaltyTransaction/bulk_create.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params, queryRunner) => {
  const { transactionsArray, user = "system" } = params;

  if (!Array.isArray(transactionsArray) || transactionsArray.length === 0) {
    return {
      status: false,
      message: "transactionsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await loyaltyTransactionService.bulkCreate(transactionsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateTransactions:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};