// src/main/ipc/core/inventoryMovement/export.ipc.js
//@ts-check
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await inventoryMovementService.exportMovements(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportMovements:", error);
    return {
      status: false,
      message: error.message || "Failed to export inventory movements",
      data: null,
    };
  }
};