// src/main/ipc/core/batch/delete.ipc.js
//@ts-check
const batchService = require("../../../../services/Batch");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const result = await batchService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Batch deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to delete batch",
      data: null,
    };
  }
};