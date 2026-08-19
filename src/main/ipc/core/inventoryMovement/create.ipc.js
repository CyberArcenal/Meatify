// src/main/ipc/core/inventoryMovement/create.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.meatId) {
    return { status: false, message: "meatId is required", data: null };
  }
  if (!data.movementType) {
    return { status: false, message: "movementType is required", data: null };
  }
  if (data.qtyChange === undefined || data.qtyChange === null || data.qtyChange === 0) {
    return { status: false, message: "qtyChange must be non-zero", data: null };
  }

  try {
    const result = await inventoryMovementService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Inventory movement created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createMovement:", error);
    return {
      status: false,
      message: error.message || "Failed to create inventory movement",
      data: null,
    };
  }
};