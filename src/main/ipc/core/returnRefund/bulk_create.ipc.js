// src/main/ipc/core/returnRefund/bulk_create.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { returnsArray, user = "system" } = params;

  if (!Array.isArray(returnsArray) || returnsArray.length === 0) {
    return {
      status: false,
      message: "returnsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await returnRefundService.bulkCreate(returnsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateReturns:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};