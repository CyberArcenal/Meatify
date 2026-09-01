// src/main/ipc/core/returnRefund/update.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    const result = await returnRefundService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Return updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to update return",
      data: null,
    };
  }
};