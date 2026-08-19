// src/main/ipc/core/inventoryMovement/permanent_delete.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid movement ID is required", data: null };
  }

  try {
    await inventoryMovementService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Inventory movement permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteMovement:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete inventory movement",
      data: null,
    };
  }
};