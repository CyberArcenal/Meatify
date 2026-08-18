// src/main/ipc/core/auditLog/get/statistics.ipc.js
const auditLogService = require("../../../../../services/AuditLogService");

module.exports = async () => {
  try {
    const result = await auditLogService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getAuditLogStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};