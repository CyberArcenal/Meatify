// src/main/ipc/core/batch/update_status.ipc.js
//@ts-check
const batchService = require("../../../../services/Batch");

module.exports = async (params, queryRunner) => {
  const { id, status, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const result = await batchService.updateStatus(
      id,
      status,
      user,
      queryRunner,
    );
    return {
      status: true,
      message: "Batch status updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateBatchStatus:", error);
    return {
      status: false,
      message: error.message || "Failed to update batch status",
      data: null,
    };
  }
};
