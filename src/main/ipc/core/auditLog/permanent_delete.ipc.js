// src/main/ipc/core/auditLog/permanent_delete.ipc.js
const auditLogService = require("../../../../services/AuditLogService");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { 
      status: false, 
      message: "Valid audit log ID is required", 
      data: null 
    };
  }

  try {
    await auditLogService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "AuditLog permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteAuditLog:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete audit log",
      data: null,
    };
  }
};