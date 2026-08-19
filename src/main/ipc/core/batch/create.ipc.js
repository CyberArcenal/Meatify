// src/main/ipc/core/batch/create.ipc.js
const batchService = require("../../../../services/Batch");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.meatId) {
    return { status: false, message: "meatId is required", data: null };
  }
  if (!data.quantity || data.quantity <= 0) {
    return { status: false, message: "quantity must be greater than 0", data: null };
  }
  if (!data.unitCost || data.unitCost < 0) {
    return { status: false, message: "unitCost must be non-negative", data: null };
  }
  if (!data.expiryDate) {
    return { status: false, message: "expiryDate is required", data: null };
  }

  try {
    const result = await batchService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Batch created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to create batch",
      data: null,
    };
  }
};