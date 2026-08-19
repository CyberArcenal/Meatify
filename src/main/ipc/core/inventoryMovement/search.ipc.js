// src/main/ipc/core/inventoryMovement/search.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, meatId, batchId, saleId, movementType, direction, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      meatId,
      batchId,
      saleId,
      movementType,
      direction,
      startDate,
      endDate,
      ...filters,
    };

    const result = await inventoryMovementService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchMovements:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};