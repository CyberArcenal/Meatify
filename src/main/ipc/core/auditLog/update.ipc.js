// src/main/ipc/core/auditLog/update.ipc.js
const auditLogService = require("../../../../services/AuditLog");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { 
      status: false, 
      message: "Valid audit log ID is required", 
      data: null 
    };
  }

  try {
    const result = await auditLogService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "AuditLog updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateAuditLog:", error);
    return {
      status: false,
      message: error.message || "Failed to update audit log",
      data: null,
    };
  }
};