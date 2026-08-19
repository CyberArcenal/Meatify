// src/main/ipc/core/batch/permanent_delete.ipc.js
const batchService = require("../../../../services/Batch");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    await batchService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Batch permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete batch",
      data: null,
    };
  }
};