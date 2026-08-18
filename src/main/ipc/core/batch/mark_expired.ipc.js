// src/main/ipc/core/batch/mark_expired.ipc.js
const { BatchStateService } = require("../../../../stateServices/BatchStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { batchId, user = "system" } = params;

  if (!batchId || typeof batchId !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const stateService = new BatchStateService(AppDataSource);
    const result = await stateService.markExpired(batchId, user, queryRunner);
    return {
      status: true,
      message: `Batch #${batchId} marked as expired`,
      data: result,
    };
  } catch (error) {
    console.error("Error in markBatchExpired:", error);
    return {
      status: false,
      message: error.message || "Failed to mark batch as expired",
      data: null,
    };
  }
};