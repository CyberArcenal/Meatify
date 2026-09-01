// src/main/ipc/core/purchase/import_csv.ipc.js
//@ts-check
const purchaseService = require("../../../../services/Purchase");
const fs = require("fs").promises;

module.exports = async (params, queryRunner) => {
  const { filePath, user = "system" } = params;

  if (!filePath) {
    return { status: false, message: "filePath is required", data: null };
  }

  try {
    await fs.access(filePath);
    const result = await purchaseService.importFromCSV(filePath, user, queryRunner);
    return {
      status: true,
      message: `CSV import completed. ${result.imported.length} imported, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in importPurchasesCSV:", error);
    return {
      status: false,
      message: error.message || "Failed to import purchases",
      data: null,
    };
  }
};