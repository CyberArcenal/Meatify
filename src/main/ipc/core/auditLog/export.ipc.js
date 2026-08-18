// src/main/ipc/core/auditLog/export.ipc.js
const auditLogService = require("../../../../services/AuditLogService");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await auditLogService.exportAuditLogs(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportAuditLogs:", error);
    return {
      status: false,
      message: error.message || "Failed to export audit logs",
      data: null,
    };
  }
};