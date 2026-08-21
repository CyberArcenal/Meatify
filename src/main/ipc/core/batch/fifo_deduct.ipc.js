// src/main/ipc/core/batch/fifo_deduct.ipc.js
const { BatchStateService } = require("../../../../stateServices/Batch");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

module.exports = async (params, queryRunner) => {
  const { meatId, totalWeight, reason = "sale", metadata = {}, user = "system" } = params;

  if (!meatId || typeof meatId !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }
  if (!totalWeight || totalWeight <= 0) {
    return { status: false, message: "totalWeight must be greater than 0", data: null };
  }

  try {
    const stateService = new BatchStateService(AppDataSource);
    const result = await stateService.fifoDeduct(
      meatId,
      totalWeight,
      reason,
      metadata,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `FIFO deduction completed for meat #${meatId}: ${totalWeight}kg deducted from ${result.length} batch(es)`,
      data: result,
    };
  } catch (error) {
    console.error("Error in fifoDeduct:", error);
    return {
      status: false,
      message: error.message || "FIFO deduction failed",
      data: null,
    };
  }
};