// src/main/ipc/core/auditLog/import_csv.ipc.js
//@ts-check
const auditLogService = require("../../../../services/AuditLog");
const fs = require("fs").promises;

module.exports = async (params, queryRunner) => {
  const { filePath, user = "system" } = params;

  if (!filePath) {
    return { 
      status: false, 
      message: "filePath is required", 
      data: null 
    };
  }

  try {
    // Validate file exists
    await fs.access(filePath);
    
    const result = await auditLogService.importFromCSV(filePath, user, queryRunner);
    return {
      status: true,
      message: `CSV import completed. ${result.imported.length} imported, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in importAuditLogsCSV:", error);
    return {
      status: false,
      message: error.message || "Failed to import audit logs",
      data: null,
    };
  }
};