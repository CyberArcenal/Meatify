// src/main/ipc/core/inventoryMovement/delete.ipc.js
//@ts-check
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid movement ID is required", data: null };
  }

  try {
    // InventoryMovement uses hard delete only
    await inventoryMovementService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Inventory movement deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in deleteMovement:", error);
    return {
      status: false,
      message: error.message || "Failed to delete inventory movement",
      data: null,
    };
  }
};