// src/main/ipc/core/inventoryMovement/import_csv.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");
const fs = require("fs").promises;

module.exports = async (params, queryRunner) => {
  const { filePath, user = "system" } = params;

  if (!filePath) {
    return { status: false, message: "filePath is required", data: null };
  }

  try {
    await fs.access(filePath);
    const result = await inventoryMovementService.importFromCSV(filePath, user, queryRunner);
    return {
      status: true,
      message: `CSV import completed. ${result.imported.length} imported, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in importMovementsCSV:", error);
    return {
      status: false,
      message: error.message || "Failed to import inventory movements",
      data: null,
    };
  }
};