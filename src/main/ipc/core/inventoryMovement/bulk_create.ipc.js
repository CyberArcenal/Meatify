// src/main/ipc/core/inventoryMovement/bulk_create.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params, queryRunner) => {
  const { movementsArray, user = "system" } = params;

  if (!Array.isArray(movementsArray) || movementsArray.length === 0) {
    return {
      status: false,
      message: "movementsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await inventoryMovementService.bulkCreate(movementsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateMovements:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};