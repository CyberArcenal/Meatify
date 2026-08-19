// src/main/ipc/core/inventoryMovement/update.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid movement ID is required", data: null };
  }

  // Prevent updating meat, batch, sale, or qtyChange
  if (data.meatId || data.batchId || data.saleId || data.qtyChange !== undefined) {
    return {
      status: false,
      message: "Cannot change meat, batch, sale, or qtyChange after creation",
      data: null,
    };
  }

  try {
    const result = await inventoryMovementService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Inventory movement updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateMovement:", error);
    return {
      status: false,
      message: error.message || "Failed to update inventory movement",
      data: null,
    };
  }
};