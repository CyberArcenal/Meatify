// src/main/ipc/core/auditLog/delete.ipc.js
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
    // AuditLog uses hard delete only (no soft delete)
    await auditLogService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "AuditLog deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in deleteAuditLog:", error);
    return {
      status: false,
      message: error.message || "Failed to delete audit log",
      data: null,
    };
  }
};