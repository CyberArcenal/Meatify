// src/main/ipc/core/batch/update.ipc.js
const batchService = require("../../../../services/BatchService");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const result = await batchService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Batch updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to update batch",
      data: null,
    };
  }
};