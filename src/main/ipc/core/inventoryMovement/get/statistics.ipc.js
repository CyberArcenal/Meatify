// src/main/ipc/core/inventoryMovement/get/statistics.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

module.exports = async () => {
  try {
    const result = await inventoryMovementService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getMovementStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};