// src/main/ipc/core/auditLog/get/by_id.ipc.js
const auditLogService = require("../../../../../services/AuditLogService");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { 
      status: false, 
      message: "Valid audit log ID is required", 
      data: null 
    };
  }

  try {
    const result = await auditLogService.findById(id);
    return {
      status: true,
      message: "AuditLog retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getAuditLogById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve audit log",
      data: null,
    };
  }
};