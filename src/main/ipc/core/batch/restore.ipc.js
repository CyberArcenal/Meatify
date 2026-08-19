// src/main/ipc/core/batch/restore.ipc.js
const batchService = require("../../../../services/Batch");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const result = await batchService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Batch restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to restore batch",
      data: null,
    };
  }
};