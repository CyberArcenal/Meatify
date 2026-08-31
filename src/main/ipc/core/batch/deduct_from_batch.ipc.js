// src/main/ipc/core/batch/deduct_from_batch.ipc.js
//@ts-check
const batchService = require("../../../../services/Batch");  // ✅ CHANGED
const { logger } = require("../../../../utils/logger");

module.exports = async (params, queryRunner) => {
  const { batchId, weightKg, reason = "adjustment", metadata = {}, user = "system" } = params;

  if (!batchId || typeof batchId !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }
  if (!weightKg || weightKg <= 0) {
    return { status: false, message: "weightKg must be greater than 0", data: null };
  }

  try {
    // ✅ Calls BatchService (not StateService)
    const result = await batchService.deductFromBatch(
      batchId,
      weightKg,
      reason,
      metadata,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `Deducted ${weightKg}kg from batch #${batchId}`,
      data: {
        batch: result.batch,
        deductedWeight: result.deductedWeight,
        newRemaining: result.batch.remainingQuantity,
      },
    };
  } catch (error) {
    console.error("Error in deductFromBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to deduct from batch",
      data: null,
    };
  }
};