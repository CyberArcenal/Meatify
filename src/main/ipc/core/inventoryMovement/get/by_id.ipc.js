// src/main/ipc/core/inventoryMovement/get/by_id.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid movement ID is required", data: null };
  }

  try {
    const result = await inventoryMovementService.findById(id);
    return {
      status: true,
      message: "Inventory movement retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getMovementById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory movement",
      data: null,
    };
  }
};