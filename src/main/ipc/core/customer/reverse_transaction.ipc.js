// src/main/ipc/core/customer/reverse_transaction.ipc.js
const { CustomerStateService } = require("../../../../stateServices/CustomerStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { transactionId, reason, user = "system" } = params;

  if (!transactionId || typeof transactionId !== "number") {
    return { status: false, message: "Valid transaction ID is required", data: null };
  }
  if (!reason) {
    return { status: false, message: "reason is required", data: null };
  }

  try {
    const stateService = new CustomerStateService(AppDataSource);
    const result = await stateService.reverseTransaction(
      transactionId,
      reason,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `Transaction #${transactionId} reversed successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in reverseTransaction:", error);
    return {
      status: false,
      message: error.message || "Failed to reverse transaction",
      data: null,
    };
  }
};