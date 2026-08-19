// src/main/ipc/core/auditLog/create.ipc.js
const auditLogService = require("../../../../services/AuditLog");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.action || !data.entity) {
    return { 
      status: false, 
      message: "action and entity are required", 
      data: null 
    };
  }

  try {
    const result = await auditLogService.create(data, user, queryRunner);
    return {
      status: true,
      message: "AuditLog created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createAuditLog:", error);
    return {
      status: false,
      message: error.message || "Failed to create audit log",
      data: null,
    };
  }
};