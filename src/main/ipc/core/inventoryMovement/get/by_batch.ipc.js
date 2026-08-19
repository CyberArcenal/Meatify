// src/main/ipc/core/inventoryMovement/get/by_batch.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { batchId, page, limit } = params;

  if (!batchId || typeof batchId !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const options = {
      batchId,
      page,
      limit,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await inventoryMovementService.findAll(options);
    return {
      status: true,
      message: "Inventory movements retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getMovementsByBatch:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory movements by batch",
      data: null,
    };
  }
};