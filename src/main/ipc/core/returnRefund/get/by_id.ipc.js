// src/main/ipc/core/returnRefund/get/by_id.ipc.js
const returnRefundService = require("../../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid return ID is required", data: null };
  }

  try {
    const result = await returnRefundService.findById(id);
    return {
      status: true,
      message: "Return retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getReturnById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return",
      data: null,
    };
  }
};