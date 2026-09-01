// src/main/ipc/core/loyaltyTransaction/export.ipc.js
//@ts-check
const loyaltyTransactionService = require("../../../../services/LoyaltyTransaction");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await loyaltyTransactionService.exportTransactions(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportTransactions:", error);
    return {
      status: false,
      message: error.message || "Failed to export loyalty transactions",
      data: null,
    };
  }
};