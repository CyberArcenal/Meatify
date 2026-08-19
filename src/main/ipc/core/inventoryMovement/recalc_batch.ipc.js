// src/main/ipc/core/inventoryMovement/recalc_batch.ipc.js
const { InventoryMovementStateService } = require("../../../../stateServices/InventoryMovementStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { batchId, user = "system" } = params;

  if (!batchId || typeof batchId !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const stateService = new InventoryMovementStateService(AppDataSource);
    const result = await stateService.recalcBatchRemaining(batchId, user, queryRunner);
    return {
      status: true,
      message: `Batch #${batchId} recalculated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in recalcBatchRemaining:", error);
    return {
      status: false,
      message: error.message || "Failed to recalculate batch",
      data: null,
    };
  }
};