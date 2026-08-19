// src/main/ipc/core/inventoryMovement/get/all.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
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
    console.error("Error in getAllMovements:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory movements",
      data: null,
    };
  }
};